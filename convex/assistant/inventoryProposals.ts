import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";
import { generateInventoryCode } from "../lib/inventoryCode";
import { computeStockTotal } from "../lib/stockHelpers";

/** Crea una propuesta de alta o ajuste de inventario (pendiente de confirmar). La llama el asistente. */
export const createProposalInternal = internalMutation({
  args: {
    userId: v.string(),
    conversationId: v.id("assistantConversations"),
    kind: v.union(v.literal("create"), v.literal("update")),
    inventoryId: v.optional(v.id("inventory")),
    name: v.string(),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    material: v.optional(v.string()),
    detalle: v.optional(v.string()),
    sizes: v.record(v.string(), v.number()),
    costPrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assistantInventoryProposals", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/** Propuestas pendientes de la conversación (para el modal). */
export const listPendingProposals = query({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("assistantInventoryProposals")
      .withIndex("by_conversation_status", (q) =>
        q.eq("conversationId", conversationId).eq("status", "pending")
      )
      .collect();
    return rows.filter((r) => r.userId === userId);
  },
});

export const cancelProposals = mutation({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) throw new Error("No autenticado");
    const rows = await ctx.db
      .query("assistantInventoryProposals")
      .withIndex("by_conversation_status", (q) =>
        q.eq("conversationId", conversationId).eq("status", "pending")
      )
      .collect();
    for (const r of rows) {
      if (r.userId === userId) await ctx.db.patch(r._id, { status: "cancelled" });
    }
  },
});

/** Confirma las propuestas pendientes: aplica los cambios reales de inventario y avisa en el chat. */
export const confirmProposals = mutation({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) throw new Error("No autenticado");
    const rows = await ctx.db
      .query("assistantInventoryProposals")
      .withIndex("by_conversation_status", (q) =>
        q.eq("conversationId", conversationId).eq("status", "pending")
      )
      .collect();

    let created = 0;
    let updated = 0;
    const summaryLines: string[] = [];

    for (const p of rows) {
      if (p.userId !== userId) continue;

      if (p.kind === "create") {
        // Misma lógica que addInventory (convex/mutations/inventory.ts) — duplicada
        // en vez de cross-llamada, igual patrón que confirmProposals de ventas.
        const stockTotal = computeStockTotal(p.sizes);
        const inventoryId = await ctx.db.insert("inventory", {
          userId,
          name: p.name.trim().toUpperCase(),
          category: (p.category || "OTROS").toUpperCase(),
          subcategory: p.subcategory?.toUpperCase(),
          material: p.material?.toUpperCase(),
          costPrice: p.costPrice ?? 0,
          sellingPrice: p.sellingPrice ?? 0,
          sizes: p.sizes,
          stockTotal,
          detalle: p.detalle?.trim() || undefined,
        });
        await ctx.db.patch(inventoryId, { barcode: generateInventoryCode(inventoryId) });

        for (const [size, qty] of Object.entries(p.sizes)) {
          if (qty > 0) {
            await ctx.db.insert("inventoryMovements", {
              inventoryId,
              userId,
              movementType: "initial",
              size,
              quantityChange: qty,
              quantityBefore: 0,
              quantityAfter: qty,
              referenceType: "assistant",
            });
          }
        }
        created += 1;
        summaryLines.push(`✓ ${p.name}`);
      } else if (p.kind === "update" && p.inventoryId) {
        const item = await ctx.db.get(p.inventoryId);
        if (!item || item.userId !== userId) continue;

        const newSizes = { ...item.sizes };
        for (const [size, delta] of Object.entries(p.sizes)) {
          const before = newSizes[size] ?? 0;
          const after = Math.max(0, before + delta);
          newSizes[size] = after;
          await ctx.db.insert("inventoryMovements", {
            inventoryId: p.inventoryId,
            userId,
            movementType: "adjustment",
            size,
            quantityChange: after - before,
            quantityBefore: before,
            quantityAfter: after,
            referenceType: "assistant",
          });
        }
        await ctx.db.patch(p.inventoryId, {
          sizes: newSizes,
          stockTotal: computeStockTotal(newSizes),
        });
        updated += 1;
        summaryLines.push(`✓ ${p.name} ajustado`);
      }

      await ctx.db.patch(p._id, { status: "confirmed" });
    }

    if (created + updated > 0) {
      const conv = await ctx.db.get(conversationId);
      if (conv) {
        const parts: string[] = [];
        if (created > 0) parts.push(`${created} producto${created > 1 ? "s" : ""} cargado${created > 1 ? "s" : ""}`);
        if (updated > 0) parts.push(`${updated} ajuste${updated > 1 ? "s" : ""}`);
        await ctx.db.patch(conversationId, {
          messages: [
            ...conv.messages,
            { role: "assistant" as const, content: `✓ ${parts.join(" y ")}.`, createdAt: Date.now() },
          ],
          lastActivityAt: Date.now(),
        });
      }
    }
    return { created, updated };
  },
});
