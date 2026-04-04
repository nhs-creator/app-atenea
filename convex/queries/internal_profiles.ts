import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getStableUserId } from "../lib/auth";

/** Usado internamente por el action createAccountant para verificar el rol del caller. */
export const getRole = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }) => {
    const userId = getStableUserId(tokenIdentifier);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return profile?.role ?? null;
  },
});
