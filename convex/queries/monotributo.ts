import { query } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";

/**
 * Devuelve la escala de categorías de monotributo del owner asignado.
 * Funciona tanto para owner como para accountant (vía getEffectiveUserId).
 */
export const listCategories = query({
  handler: async (ctx) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];
    const cats = await ctx.db
      .query("monotributoCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return cats.sort((a, b) => a.order - b.order);
  },
});

/**
 * Devuelve la letra de la categoría actual del owner asignado.
 */
export const getCurrentCategory = query({
  handler: async (ctx) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return profile?.monotributoCategory ?? null;
  },
});

/**
 * Lista todos los registros de "facturado mensual" del año dado.
 * yearPrefix es del estilo "2026".
 */
export const listMonthlyBilling = query({
  args: { yearPrefix: v.string() },
  handler: async (ctx, { yearPrefix }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db
      .query("monthlyBilling")
      .withIndex("by_userId_yearMonth", (q) =>
        q
          .eq("userId", userId)
          .gte("yearMonth", `${yearPrefix}-00`)
          .lte("yearMonth", `${yearPrefix}-99`)
      )
      .collect();
    return all;
  },
});
