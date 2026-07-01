import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";

/** listInvoices: todas las facturas/NC del comercio, para armar el mapa por clientNumber en la UI. */
export const listInvoices = query({
  handler: async (ctx) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("invoices")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** getByClientNumber: para mostrar "ya facturado" (CAE/número fiscal) en la UI. */
export const getByClientNumber = query({
  args: { clientNumber: v.string() },
  handler: async (ctx, { clientNumber }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("invoices")
      .withIndex("by_userId_clientNumber", (q) =>
        q.eq("userId", userId).eq("clientNumber", clientNumber)
      )
      .first();
  },
});

/** getByClientNumberInternal: chequeo de idempotencia dentro de la action de emisión. */
export const getByClientNumberInternal = internalQuery({
  args: { userId: v.string(), clientNumber: v.string() },
  handler: async (ctx, { userId, clientNumber }) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_userId_clientNumber", (q) =>
        q.eq("userId", userId).eq("clientNumber", clientNumber)
      )
      .first();
  },
});

/** getByIdInternal: trae un comprobante por id (usado al emitir la NC). */
export const getByIdInternal = internalQuery({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    return await ctx.db.get(invoiceId);
  },
});

/**
 * listMonthlyInvoiced: suma el importe realmente facturado en AFIP por mes
 * (netea facturas y notas de crédito, que se guardan con importeTotal negativo
 * cuando corresponde — ver actions/afip.ts). Para mostrar junto al "facturado"
 * manual en AccountantFiscal, sin reemplazarlo.
 */
export const listMonthlyInvoiced = query({
  args: { yearPrefix: v.string() },
  handler: async (ctx, { yearPrefix }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return {};

    const all = await ctx.db
      .query("invoices")
      .withIndex("by_userId_yearMonth", (q) =>
        q.eq("userId", userId).gte("yearMonth", `${yearPrefix}-00`).lte("yearMonth", `${yearPrefix}-99`)
      )
      .collect();

    const byMonth: Record<string, number> = {};
    for (const inv of all) {
      byMonth[inv.yearMonth] = (byMonth[inv.yearMonth] ?? 0) + inv.importeTotal;
    }
    return byMonth;
  },
});
