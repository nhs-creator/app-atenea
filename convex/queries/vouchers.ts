import { query } from "../_generated/server";
import { getAuthUserId } from "../lib/auth";

export const listActiveVouchers = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
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
