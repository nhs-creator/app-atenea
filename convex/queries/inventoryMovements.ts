import { query } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";

export const listByInventory = query({
  args: { inventoryId: v.id("inventory") },
  handler: async (ctx, { inventoryId }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];

    const item = await ctx.db.get(inventoryId);
    if (!item || item.userId !== userId) return [];

    const movements = await ctx.db
      .query("inventoryMovements")
      .withIndex("by_inventoryId", (q) => q.eq("inventoryId", inventoryId))
      .order("desc")
      .take(50);

    return movements;
  },
});
