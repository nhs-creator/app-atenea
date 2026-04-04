import { query } from "../_generated/server";
import { getEffectiveUserId } from "../lib/auth";

export const listActiveVouchers = query({
  handler: async (ctx) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("vouchers")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .order("desc")
      .collect();
  },
});
