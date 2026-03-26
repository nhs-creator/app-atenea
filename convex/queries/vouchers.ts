import { query } from "../_generated/server";

export const listActiveVouchers = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return ctx.db
      .query("vouchers")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .order("desc")
      .collect();
  },
});
