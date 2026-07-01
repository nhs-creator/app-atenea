import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";

export const listSales = query({
  args: { cutoffDate: v.string() },
  handler: async (ctx, { cutoffDate }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", cutoffDate)
      )
      .order("desc")
      .collect();
  },
});

/**
 * getTransactionInternal: usado por la action de AFIP para traer la venta
 * agrupada por clientNumber y calcular el importe total a facturar. Solo
 * considera ventas "completed" — no tiene sentido facturar una seña pendiente.
 */
export const getTransactionInternal = internalQuery({
  args: { userId: v.string(), clientNumber: v.string() },
  handler: async (ctx, { userId, clientNumber }) => {
    const items = await ctx.db
      .query("sales")
      .withIndex("by_userId_clientNumber", (q) =>
        q.eq("userId", userId).eq("clientNumber", clientNumber)
      )
      .collect();

    if (items.length === 0) return null;
    if (items[0].status !== "completed") return null;

    const importeTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { items, importeTotal, clientId: items[0].clientId };
  },
});
