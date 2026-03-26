import { query } from "../_generated/server";
import { v } from "convex/values";

export const listByInventory = query({
  args: { inventoryId: v.id("inventory") },
  handler: async (ctx, { inventoryId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const movements = await ctx.db
      .query("inventoryMovements")
      .withIndex("by_inventoryId", (q) => q.eq("inventoryId", inventoryId))
      .order("desc")
      .take(50);

    return movements;
  },
});
