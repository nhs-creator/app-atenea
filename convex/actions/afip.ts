"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  isAfipConfigured,
  createAfipInstance,
  formatFiscalNumber,
  buildAfipQrPayload,
  todayArgentina,
} from "../lib/afipSdk";

async function requireAuthAction(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("No autenticado");
}

/**
 * emitirFactura: emite una Factura C (CbteTipo=11, Concepto=1 Productos) para
 * la venta agrupada por `clientNumber`, y la persiste ya con el CAE confirmado.
 *
 * Flow:
 * 1. Resuelve el usuario efectivo (dueña o contadora asignada).
 * 2. Idempotencia: si ya existe un comprobante para este clientNumber, lo devuelve.
 * 3. Trae la transacción de `sales` (debe estar "completed") y su importe total.
 * 4. Envía a ARCA → obtiene CAE.
 * 5. Genera QR + número fiscal, y recién ahí persiste el registro.
 */
export const emitirFactura = action({
  args: {
    clientNumber: v.string(),
    docTipo: v.number(),
    docNro: v.number(),
    condicionIvaReceptor: v.number(),
  },
  handler: async (ctx, args): Promise<{ cae: string; caeExpiration: string; cbteNro: number; fiscalNumber: string }> => {
    await requireAuthAction(ctx);

    if (!isAfipConfigured()) {
      throw new Error("AFIP no configurado. Configure AFIP_CERT, AFIP_KEY y AFIP_SDK_TOKEN.");
    }

    const userId: string | null = await ctx.runQuery(
      internal.queries.internal_profiles.getEffectiveUserIdInternal
    );
    if (!userId) throw new Error("No autenticado");

    // Idempotencia: no volver a emitir si esta venta ya tiene un comprobante.
    const existing = await ctx.runQuery(internal.queries.invoices.getByClientNumberInternal, {
      userId,
      clientNumber: args.clientNumber,
    });
    if (existing) {
      return {
        cae: existing.afipCae,
        caeExpiration: existing.afipCaeExpiration,
        cbteNro: existing.afipCbteNro,
        fiscalNumber: existing.afipFiscalNumber,
      };
    }

    const transaction = await ctx.runQuery(internal.queries.sales.getTransactionInternal, {
      userId,
      clientNumber: args.clientNumber,
    });
    if (!transaction) {
      throw new Error("Venta no encontrada o no está completada — solo se puede facturar una venta completada");
    }
    if (transaction.importeTotal <= 0) {
      throw new Error("Esta venta fue en efectivo — el efectivo no se factura, no hay importe para emitir");
    }

    const afipConfig = await ctx.runQuery(internal.queries.afipConfig.getConfigInternal);
    if (!afipConfig) throw new Error("Configuración AFIP no encontrada");

    const afip = createAfipInstance({ cuit: afipConfig.cuit, isProduction: afipConfig.isProduction });

    const tipoDeCbte = 11; // Factura C
    const concepto = 1; // Productos — no requiere período de servicio
    const fechaHoy = todayArgentina();
    const cbteFchInt = parseInt(fechaHoy.replace(/-/g, ""));

    const data = {
      CantReg: 1,
      PtoVta: afipConfig.puntoVenta,
      CbteTipo: tipoDeCbte,
      Concepto: concepto,
      DocTipo: args.docTipo,
      DocNro: args.docNro,
      CbteFch: cbteFchInt,
      ImpTotal: transaction.importeTotal,
      ImpTotConc: 0,
      ImpNeto: transaction.importeTotal,
      ImpOpEx: 0,
      ImpIVA: 0,
      ImpTrib: 0,
      MonId: "PES",
      MonCotiz: 1,
      // Condición IVA del receptor — obligatorio desde RG 5616.
      CondicionIVAReceptorId: args.condicionIvaReceptor,
    };

    let res: { CAE: string; CAEFchVto: string; voucherNumber: number };
    try {
      res = await afip.ElectronicBilling.createNextVoucher(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        console.error("[AFIP] last request XML:", await afip.getLastRequestXML());
      } catch { /* noop */ }
      throw new Error(`Error ARCA: ${message}`);
    }

    const cae = res.CAE;
    const caeExpiration = res.CAEFchVto;
    const cbteNro = res.voucherNumber;

    const qrData = buildAfipQrPayload({
      ver: 1,
      fecha: fechaHoy,
      cuit: afipConfig.cuit,
      ptoVta: afipConfig.puntoVenta,
      cbteTipo: tipoDeCbte,
      cbteNro,
      importe: transaction.importeTotal,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: args.docTipo,
      nroDocRec: args.docNro,
      tipoCodAut: "E",
      codAut: parseInt(cae),
    });

    const fiscalNumber = formatFiscalNumber(tipoDeCbte, afipConfig.puntoVenta, cbteNro);

    await ctx.runMutation(internal.mutations.invoices.createInvoiceRecord, {
      userId,
      yearMonth: fechaHoy.slice(0, 7),
      clientNumber: args.clientNumber,
      clientId: transaction.clientId,
      docTipo: args.docTipo,
      docNro: args.docNro,
      condicionIvaReceptor: args.condicionIvaReceptor,
      importeTotal: transaction.importeTotal,
      afipCae: cae,
      afipCaeExpiration: caeExpiration,
      afipPuntoVenta: afipConfig.puntoVenta,
      afipCbteNro: cbteNro,
      afipCbteTipo: tipoDeCbte,
      afipConcepto: concepto,
      afipQrData: qrData,
      afipFiscalNumber: fiscalNumber,
    });

    return { cae, caeExpiration, cbteNro, fiscalNumber };
  },
});

/**
 * emitirNotaCredito: anula una Factura C ya emitida con una NC-C (tipo 13) por
 * el importe total (v1 no soporta parcialidad). Se envía a ARCA ANTES de crear
 * el registro en la base, para no dejar un comprobante fantasma en estado
 * "fiscal" si ARCA rechaza el comprobante.
 */
export const emitirNotaCredito = action({
  args: {
    invoiceId: v.id("invoices"),
    motivo: v.string(),
  },
  handler: async (ctx, args): Promise<{ cae: string; caeExpiration: string; cbteNro: number; fiscalNumber: string }> => {
    await requireAuthAction(ctx);

    if (!isAfipConfigured()) {
      throw new Error("AFIP no configurado. Configure AFIP_CERT, AFIP_KEY y AFIP_SDK_TOKEN.");
    }

    const userId: string | null = await ctx.runQuery(
      internal.queries.internal_profiles.getEffectiveUserIdInternal
    );
    if (!userId) throw new Error("No autenticado");

    const original = await ctx.runQuery(internal.queries.invoices.getByIdInternal, {
      invoiceId: args.invoiceId,
    });
    if (!original || original.userId !== userId) throw new Error("Factura no encontrada");
    if (original.afipCbteTipo === 13) throw new Error("No se puede anular una nota de crédito");

    const afipConfig = await ctx.runQuery(internal.queries.afipConfig.getConfigInternal);
    if (!afipConfig) throw new Error("Configuración AFIP no encontrada");

    const afip = createAfipInstance({ cuit: afipConfig.cuit, isProduction: afipConfig.isProduction });

    const tipoDeCbte = 13; // Nota de Crédito C
    const fechaHoy = todayArgentina();
    const cbteFchInt = parseInt(fechaHoy.replace(/-/g, ""));

    const data = {
      CantReg: 1,
      PtoVta: afipConfig.puntoVenta,
      CbteTipo: tipoDeCbte,
      Concepto: original.afipConcepto,
      DocTipo: original.docTipo,
      DocNro: original.docNro,
      CbteFch: cbteFchInt,
      ImpTotal: original.importeTotal,
      ImpTotConc: 0,
      ImpNeto: original.importeTotal,
      ImpOpEx: 0,
      ImpIVA: 0,
      ImpTrib: 0,
      MonId: "PES",
      MonCotiz: 1,
      CondicionIVAReceptorId: original.condicionIvaReceptor,
      CbtesAsoc: [
        { Tipo: original.afipCbteTipo, PtoVta: original.afipPuntoVenta, Nro: original.afipCbteNro },
      ],
    };

    let res: { CAE: string; CAEFchVto: string; voucherNumber: number };
    try {
      res = await afip.ElectronicBilling.createNextVoucher(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        console.error("[AFIP] last request XML:", await afip.getLastRequestXML());
      } catch { /* noop */ }
      throw new Error(`Error ARCA: ${message}`);
    }

    const cae = res.CAE;
    const caeExpiration = res.CAEFchVto;
    const cbteNro = res.voucherNumber;

    const qrData = buildAfipQrPayload({
      ver: 1,
      fecha: fechaHoy,
      cuit: afipConfig.cuit,
      ptoVta: afipConfig.puntoVenta,
      cbteTipo: tipoDeCbte,
      cbteNro,
      importe: original.importeTotal,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: original.docTipo,
      nroDocRec: original.docNro,
      tipoCodAut: "E",
      codAut: parseInt(cae),
    });

    const fiscalNumber = formatFiscalNumber(tipoDeCbte, afipConfig.puntoVenta, cbteNro);

    await ctx.runMutation(internal.mutations.invoices.createInvoiceRecord, {
      userId,
      yearMonth: fechaHoy.slice(0, 7),
      clientNumber: original.clientNumber,
      clientId: original.clientId,
      docTipo: original.docTipo,
      docNro: original.docNro,
      condicionIvaReceptor: original.condicionIvaReceptor,
      importeTotal: -original.importeTotal, // negativo: netea el total facturado del mes
      afipCae: cae,
      afipCaeExpiration: caeExpiration,
      afipPuntoVenta: afipConfig.puntoVenta,
      afipCbteNro: cbteNro,
      afipCbteTipo: tipoDeCbte,
      afipConcepto: original.afipConcepto,
      afipQrData: qrData,
      afipFiscalNumber: fiscalNumber,
      creditNoteFor: args.invoiceId,
      motivo: args.motivo,
    });

    return { cae, caeExpiration, cbteNro, fiscalNumber };
  },
});

/** testConnection: verifica la conexión con ARCA. Retorna server status y último comprobante. */
export const testConnection = action({
  args: {},
  handler: async (ctx): Promise<{ serverStatus: Record<string, unknown>; lastVoucher: number; puntoVenta: number }> => {
    await requireAuthAction(ctx);

    if (!isAfipConfigured()) {
      throw new Error("AFIP no configurado. Configure AFIP_CERT, AFIP_KEY y AFIP_SDK_TOKEN.");
    }

    const afipConfig = await ctx.runQuery(internal.queries.afipConfig.getConfigInternal);
    if (!afipConfig) throw new Error("Configuración AFIP no encontrada");

    const afip = createAfipInstance({ cuit: afipConfig.cuit, isProduction: afipConfig.isProduction });

    try {
      const serverStatus = (await afip.ElectronicBilling.getServerStatus()) as Record<string, unknown>;
      const lastVoucher = (await afip.ElectronicBilling.getLastVoucher(afipConfig.puntoVenta, 11)) as number;
      return { serverStatus, lastVoucher, puntoVenta: afipConfig.puntoVenta };
    } catch (err: unknown) {
      const e = err as { message?: string; data?: unknown; status?: number };
      const detail = e.data ? JSON.stringify(e.data) : e.message ?? String(err);
      throw new Error(`ARCA error (${e.status ?? "?"}): ${detail}`);
    }
  },
});
