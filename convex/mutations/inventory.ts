import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { computeStockTotal } from "../lib/stockHelpers";

export const addInventory = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    material: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    sizes: v.record(v.string(), v.number()),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stockTotal = computeStockTotal(args.sizes);

    const inventoryId = await ctx.db.insert("inventory", {
      userId: identity.tokenIdentifier,
      name: args.name.trim().toUpperCase(),
      category: args.category.toUpperCase(),
      subcategory: args.subcategory?.toUpperCase(),
      material: args.material?.toUpperCase(),
      costPrice: args.costPrice,
      sellingPrice: args.sellingPrice,
      sizes: args.sizes,
      stockTotal,
      sku: args.sku,
      barcode: args.barcode,
    });

    // Registrar movimiento inicial para cada talle con stock
    for (const [size, qty] of Object.entries(args.sizes)) {
      if (qty > 0) {
        await ctx.db.insert("inventoryMovements", {
          inventoryId,
          userId: identity.tokenIdentifier,
          movementType: "initial",
          size,
          quantityChange: qty,
          quantityBefore: 0,
          quantityAfter: qty,
          referenceType: "manual",
        });
      }
    }

    return inventoryId;
  },
});

export const updateInventory = mutation({
  args: {
    id: v.id("inventory"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    material: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    sizes: v.optional(v.record(v.string(), v.number())),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.tokenIdentifier) {
      throw new Error("Producto no encontrado");
    }

    // Si cambiaron precios, registrar en historial
    if (
      (args.costPrice !== undefined && args.costPrice !== existing.costPrice) ||
      (args.sellingPrice !== undefined && args.sellingPrice !== existing.sellingPrice)
    ) {
      await ctx.db.insert("inventoryPriceHistory", {
        inventoryId: args.id,
        costPrice: args.costPrice ?? existing.costPrice,
        sellingPrice: args.sellingPrice ?? existing.sellingPrice,
        changedBy: identity.tokenIdentifier,
      });
    }

    // Si cambiaron sizes, registrar movimientos de ajuste
    if (args.sizes) {
      const oldSizes = existing.sizes;
      const allSizeKeys = new Set([
        ...Object.keys(oldSizes),
        ...Object.keys(args.sizes),
      ]);

      for (const size of allSizeKeys) {
        const oldQty = oldSizes[size] ?? 0;
        const newQty = args.sizes[size] ?? 0;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          await ctx.db.insert("inventoryMovements", {
            inventoryId: args.id,
            userId: identity.tokenIdentifier,
            movementType: "adjustment",
            size,
            quantityChange: diff,
            quantityBefore: oldQty,
            quantityAfter: newQty,
            referenceType: "manual",
          });
        }
      }
    }

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.toUpperCase();
    if (args.category !== undefined) patch.category = args.category.toUpperCase();
    if (args.subcategory !== undefined) patch.subcategory = args.subcategory?.toUpperCase();
    if (args.material !== undefined) patch.material = args.material?.toUpperCase();
    if (args.costPrice !== undefined) patch.costPrice = args.costPrice;
    if (args.sellingPrice !== undefined) patch.sellingPrice = args.sellingPrice;
    if (args.sku !== undefined) patch.sku = args.sku;
    if (args.barcode !== undefined) patch.barcode = args.barcode;
    if (args.sizes !== undefined) {
      patch.sizes = args.sizes;
      patch.stockTotal = computeStockTotal(args.sizes);
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const deleteInventory = mutation({
  args: { id: v.id("inventory") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.tokenIdentifier) {
      throw new Error("Producto no encontrado");
    }

    // Verificar que no existan movimientos (equivalente a ON DELETE RESTRICT)
    const movements = await ctx.db
      .query("inventoryMovements")
      .withIndex("by_inventoryId", (q) => q.eq("inventoryId", id))
      .first();

    if (movements) {
      // Tiene movimientos — borrar todo el historial asociado
      const allMovements = await ctx.db
        .query("inventoryMovements")
        .withIndex("by_inventoryId", (q) => q.eq("inventoryId", id))
        .collect();
      for (const m of allMovements) await ctx.db.delete(m._id);

      const priceHistory = await ctx.db
        .query("inventoryPriceHistory")
        .withIndex("by_inventoryId", (q) => q.eq("inventoryId", id))
        .collect();
      for (const p of priceHistory) await ctx.db.delete(p._id);
    }

    await ctx.db.delete(id);
  },
});
