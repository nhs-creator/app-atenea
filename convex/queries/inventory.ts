import { query } from "../_generated/server";
import { getAuthUserId } from "../lib/auth";

export const listInventory = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("inventory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const lowStockItems = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("inventory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const alerts: Array<{
      _id: string;
      name: string;
      sku?: string;
      barcode?: string;
      category: string;
      subcategory?: string;
      stockTotal: number;
      sellingPrice: number;
      size: string;
      quantity: number;
      alertLevel: "OUT_OF_STOCK" | "CRITICAL" | "LOW";
    }> = [];

    for (const item of items) {
      for (const [size, qty] of Object.entries(item.sizes)) {
        let alertLevel: "OUT_OF_STOCK" | "CRITICAL" | "LOW" | null = null;
        if (qty === 0) alertLevel = "OUT_OF_STOCK";
        else if (qty <= 2) alertLevel = "CRITICAL";
        else if (qty <= 5) alertLevel = "LOW";

        if (alertLevel) {
          alerts.push({
            _id: item._id,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            category: item.category,
            subcategory: item.subcategory,
            stockTotal: item.stockTotal,
            sellingPrice: item.sellingPrice,
            size,
            quantity: qty,
            alertLevel,
          });
        }
      }
    }

    return alerts;
  },
});
