import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

export const listExpenses = query({
  args: { cutoffDate: v.string() },
  handler: async (ctx, { cutoffDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("expenses")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", cutoffDate)
      )
      .order("desc")
      .collect();
  },
});
