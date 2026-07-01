import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * createInvoiceRecord: internal. Persiste el comprobante SOLO después de que
 * ARCA confirmó el CAE (llamado desde convex/actions/afip.ts) — así nunca
 * queda una fila "fantasma" en la app que no exista realmente en AFIP.
 */
export const createInvoiceRecord = internalMutation({
  args: {
    userId: v.string(),
    yearMonth: v.string(),
    clientNumber: v.string(),
    clientId: v.optional(v.id("clients")),
    docTipo: v.number(),
    docNro: v.number(),
    condicionIvaReceptor: v.number(),
    importeTotal: v.number(),
    afipCae: v.string(),
    afipCaeExpiration: v.string(),
    afipPuntoVenta: v.number(),
    afipCbteNro: v.number(),
    afipCbteTipo: v.number(),
    afipConcepto: v.number(),
    afipQrData: v.string(),
    afipFiscalNumber: v.string(),
    creditNoteFor: v.optional(v.id("invoices")),
    motivo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("invoices", args);
  },
});
