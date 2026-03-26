import { query } from "../_generated/server";
import { v } from "convex/values";

export const listSales = query({
  args: { cutoffDate: v.string() },
  handler: async (ctx, { cutoffDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", identity.tokenIdentifier).gte("date", cutoffDate)
      )
      .order("desc")
      .collect();
  },
});
