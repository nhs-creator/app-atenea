import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getStableUserId, getEffectiveUserId } from "../lib/auth";

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

/**
 * Resuelve el userId efectivo del caller (dueña o el owner asignado si es
 * contadora). Las actions no tienen `ctx.db`, así que envuelven esta query
 * para reusar `getEffectiveUserId` sin duplicar la lógica de resolución.
 */
export const getEffectiveUserIdInternal = internalQuery({
  handler: async (ctx) => {
    return await getEffectiveUserId(ctx);
  },
});
