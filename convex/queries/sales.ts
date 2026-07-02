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
 * agrupada por clientNumber y calcular el importe a facturar. Solo considera
 * ventas "completed" — no tiene sentido facturar una seña pendiente.
 *
 * IMPORTANTE: el efectivo no se factura (regla del negocio). El importe a
 * facturar es la suma de los medios de pago no-efectivo (Transferencia,
 * Débito, Crédito) de paymentDetails — NO el total de la venta. "Vale" tampoco
 * cuenta (no es un cobro real). Todas las líneas de una transacción comparten
 * el mismo paymentDetails, así que alcanza con mirar el de la primera.
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

    const importeTotal = items[0].paymentDetails
      .filter((p) => p.method === "Transferencia" || p.method === "Débito" || p.method === "Crédito")
      .reduce((sum, p) => sum + p.amount, 0);

    return { items, importeTotal, clientId: items[0].clientId };
  },
});
