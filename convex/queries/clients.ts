import { query } from "../_generated/server";
import { getEffectiveUserId } from "../lib/auth";

export const listClients = query({
  handler: async (ctx) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("clients")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});
