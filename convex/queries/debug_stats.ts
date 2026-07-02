import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Diagnóstico temporal: cruza las ventas registradas en la app durante un mes
 * contra el total real facturado en AFIP (dato externo, se pasa a mano).
 * Agrupa por día: cantidad de transacciones únicas (por clientNumber) y monto
 * cobrado (excluye ventas canceladas), para comparar contra el export de ARCA.
 */
export const monthCrossCheck = internalQuery({
  args: { yearMonth: v.string() },
  handler: async (ctx, { yearMonth }) => {
    const allSales = await ctx.db.query("sales").take(5000);
    const monthSales = allSales.filter((s) => s.date.startsWith(yearMonth) && s.status !== "cancelled");

    // Dedupe por clientNumber (una transacción = varias líneas que comparten paymentDetails).
    const byTransaction = new Map<string, { date: string; payments: typeof monthSales[number]["paymentDetails"] }>();
    for (const s of monthSales) {
      if (!byTransaction.has(s.clientNumber)) {
        byTransaction.set(s.clientNumber, { date: s.date, payments: s.paymentDetails });
      }
    }

    const byDay: Record<string, { transacciones: number; efectivo: number; sinEfectivo: number }> = {};
    for (const { date, payments } of byTransaction.values()) {
      if (!byDay[date]) byDay[date] = { transacciones: 0, efectivo: 0, sinEfectivo: 0 };
      byDay[date].transacciones++;
      for (const p of payments) {
        if (p.method === "Efectivo") byDay[date].efectivo += p.amount;
        else if (p.method === "Transferencia" || p.method === "Débito" || p.method === "Crédito") {
          byDay[date].sinEfectivo += p.amount;
        }
        // Vale intencionalmente excluido: no es un cobro real.
      }
    }

    const perDay = Object.entries(byDay)
      .map(([date, d]) => ({
        date,
        transacciones: d.transacciones,
        efectivo: Math.round(d.efectivo),
        sinEfectivo: Math.round(d.sinEfectivo),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalSinEfectivoMes = perDay.reduce((sum, d) => sum + d.sinEfectivo, 0);
    const totalEfectivoMes = perDay.reduce((sum, d) => sum + d.efectivo, 0);

    return {
      yearMonth,
      transaccionesMes: byTransaction.size,
      totalSinEfectivoMes,
      totalEfectivoMes,
      perDay,
    };
  },
});

/** Diagnóstico temporal: verificar si existe configuración AFIP guardada (sin exponer el contenido). */
export const afipConfigExists = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cfg = await ctx.db.query("afipConfig").first();
    if (!cfg) return { exists: false };
    return {
      exists: true,
      hasRazonSocial: !!cfg.razonSocial,
      puntoVenta: cfg.puntoVenta,
      isProduction: cfg.isProduction,
    };
  },
});

/** Diagnóstico temporal: contar ventas por mes y detectar duplicados. */
export const marchDiagnostic = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allSales = await ctx.db.query("sales").take(5000);

    // Agrupar por mes
    const byMonth: Record<string, { count: number; total: number }> = {};
    allSales.forEach((s) => {
      const month = s.date.slice(0, 7); // "2026-03"
      if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 };
      byMonth[month].count++;
      byMonth[month].total += s.price * s.quantity;
    });

    // Detectar registros duplicados en marzo
    const marchSales = allSales.filter((s) => s.date.startsWith("2026-03"));
    const seen = new Map<string, number>();
    marchSales.forEach((s) => {
      const key = `${s.date}|${s.clientNumber}|${s.productName}|${s.price}|${s.quantity}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    });
    const duplicates = [...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([key, count]) => ({ key, count }));

    // Muestra de transacciones de marzo
    const marchByClient: Record<string, Array<{ product: string; price: number; qty: number; date: string }>> = {};
    marchSales.forEach((s) => {
      if (!marchByClient[s.clientNumber]) marchByClient[s.clientNumber] = [];
      marchByClient[s.clientNumber].push({
        product: s.productName,
        price: s.price,
        qty: s.quantity,
        date: s.date,
      });
    });

    const sampleTransactions = Object.entries(marchByClient)
      .slice(0, 10)
      .map(([cn, items]) => ({
        clientNumber: cn,
        itemCount: items.length,
        itemsTotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),
        items,
      }));

    return {
      byMonth,
      marchRecordCount: marchSales.length,
      marchUniqueTransactions: Object.keys(marchByClient).length,
      duplicates,
      sampleTransactions,
    };
  },
});
