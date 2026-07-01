import { query, internalQuery } from "../_generated/server";
import { getEffectiveUserId } from "../lib/auth";

/**
 * getConfig: configuración AFIP del comercio (dueña o contadora asignada, vía
 * getEffectiveUserId). Sin datos sensibles — CUIT/razón social no son secretos.
 */
export const getConfig = query({
  handler: async (ctx) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("afipConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/** getConfigInternal: para uso interno (actions). Sin auth — un solo comercio por deployment. */
export const getConfigInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("afipConfig").first();
  },
});
