import { query } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";

export const listSales = query({
  args: { cutoffDate: v.string() },
  handler: async (ctx, { cutoffDate }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", cutoffDate)
      )
      .order("desc")
      .collect();
  },
});
