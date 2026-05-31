import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";
import { computeNextSemanticId } from "../lib/semanticId";

const itemV = v.object({
  product: v.string(),
  quantity: v.number(),
  price: v.number(),
  listPrice: v.optional(v.number()),
});
const payV = v.object({
  method: v.string(),
  amount: v.number(),
  installments: v.optional(v.number()),
});

function todayAR(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Crea una propuesta de venta (pendiente de confirmar). La llama el asistente. */
export const createProposalInternal = internalMutation({
  args: {
    userId: v.string(),
    conversationId: v.id("assistantConversations"),
    clientLabel: v.optional(v.string()),
    items: v.array(itemV),
    payments: v.array(payV),
    discountPercent: v.optional(v.number()),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assistantSaleProposals", {
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
      .query("assistantSaleProposals")
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
      .query("assistantSaleProposals")
      .withIndex("by_conversation_status", (q) =>
        q.eq("conversationId", conversationId).eq("status", "pending")
      )
      .collect();
    for (const r of rows) {
      if (r.userId === userId) await ctx.db.patch(r._id, { status: "cancelled" });
    }
  },
});

/** Confirma las propuestas pendientes: crea las ventas reales y avisa en el chat. */
export const confirmProposals = mutation({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) throw new Error("No autenticado");
    const rows = await ctx.db
      .query("assistantSaleProposals")
      .withIndex("by_conversation_status", (q) =>
        q.eq("conversationId", conversationId).eq("status", "pending")
      )
      .collect();

    const date = todayAR();
    let count = 0;
    let grandTotal = 0;

    for (const p of rows) {
      if (p.userId !== userId) continue;

      // ID semántico por ticket (igual que las ventas manuales).
      const todaySales = await ctx.db
        .query("sales")
        .withIndex("by_userId_date", (q) =>
          q.eq("userId", userId).eq("date", date)
        )
        .collect();
      const existing = [...new Set(todaySales.map((s) => s.clientNumber))];
      const clientNumber = computeNextSemanticId(existing, date, {
        isReturn: false,
        isPending: false,
      });

      const noteParts = ["Cargada por el asistente"];
      if (p.clientLabel) noteParts.push(p.clientLabel);
      if (p.discountPercent) noteParts.push(`${p.discountPercent}% desc.`);

      for (const it of p.items) {
        await ctx.db.insert("sales", {
          userId,
          date,
          clientNumber,
          productName: it.product,
          quantity: it.quantity,
          price: it.price,
          ...(it.listPrice ? { listPrice: it.listPrice } : {}),
          paymentMethod: p.payments[0]?.method || "Efectivo",
          paymentDetails: p.payments,
          status: "completed",
          notes: noteParts.join(" · "),
        });
      }
      await ctx.db.patch(p._id, { status: "confirmed" });
      count += 1;
      grandTotal += p.total;
    }

    // Feedback en el hilo del chat.
    if (count > 0) {
      const conv = await ctx.db.get(conversationId);
      if (conv) {
        const totalStr = Math.round(grandTotal).toLocaleString("es-AR");
        const content =
          count === 1
            ? `✓ Venta guardada por $${totalStr}.`
            : `✓ ${count} ventas guardadas por $${totalStr} en total.`;
        await ctx.db.patch(conversationId, {
          messages: [
            ...conv.messages,
            { role: "assistant" as const, content, createdAt: Date.now() },
          ],
          lastActivityAt: Date.now(),
        });
      }
    }
    return { count, total: grandTotal };
  },
});
