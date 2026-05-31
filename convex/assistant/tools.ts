import type { GenericActionCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

type ActionCtx = GenericActionCtx<DataModel>;

// ─────────────────────────── Helpers de fecha (AR) ───────────────────────
function arDateStr(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayAR(): string {
  return arDateStr(new Date());
}

/** Fecha de corte (inclusive) para un período. */
function periodFrom(period: string): string {
  const now = new Date();
  if (period === "today") return arDateStr(now);
  if (period === "yesterday") {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return arDateStr(y);
  }
  if (period === "week") {
    const w = new Date();
    w.setDate(w.getDate() - 7);
    return arDateStr(w);
  }
  return arDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Estaciones en Argentina (hemisferio sur), por número de mes (1-12).
function seasonForMonth(month: number): string {
  if (month === 12 || month <= 2) return "verano";
  if (month <= 5) return "otoño";
  if (month <= 8) return "invierno";
  return "primavera";
}

/** Límites de mes actual / anterior y temporada, en AR. */
function monthContext() {
  const today = todayAR();
  const [yStr, mStr] = today.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const nextM = m === 12 ? 1 : m + 1;
  return {
    thisStart: `${y}-${pad(m)}-01`,
    prevStart: `${prevY}-${pad(prevM)}-01`,
    monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
    seasonNow: seasonForMonth(m),
    seasonNext: seasonForMonth(nextM),
    nextMonthLabel: MONTH_NAMES[nextM - 1],
  };
}

const PERIOD_PROP = {
  type: "string",
  enum: ["today", "yesterday", "week", "month"],
  description:
    "Período: today (hoy), yesterday (ayer), week (últimos 7 días), month (mes actual desde el día 1).",
};

// ─────────────────────────── Definiciones de tools ───────────────────────
export const TOOL_DEFS = [
  {
    name: "get_financial_summary",
    description:
      "Resumen financiero del período: ventas totales, gastos del negocio, retiros personales, ganancia del negocio y lo que quedó en caja. Usalo cuando pregunten cuánto se vendió, cuánto se gastó, cuánto quedó o cómo viene el negocio.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_payment_breakdown",
    description:
      "Cuánto se vendió por cada medio de pago (Efectivo, Transferencia, Débito, Crédito) en el período. Usalo cuando pregunten cuánto entró por efectivo, transferencia, tarjeta, o el desglose por medio de pago.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_expenses_breakdown",
    description:
      "Gastos agrupados por categoría en el período. Usalo cuando pregunten en qué se gastó o cuánto se gastó en una categoría.",
    input_schema: {
      type: "object",
      properties: {
        period: PERIOD_PROP,
        type: {
          type: "string",
          enum: ["business", "personal"],
          description: "Opcional. business = gastos del negocio, personal = personales.",
        },
      },
      required: ["period"],
    },
  },
  {
    name: "get_top_products",
    description:
      "Productos más vendidos del período por facturación. Usalo cuando pregunten qué se vende más.",
    input_schema: {
      type: "object",
      properties: {
        period: PERIOD_PROP,
        limit: { type: "integer", description: "Cuántos devolver (por defecto 5)." },
      },
      required: ["period"],
    },
  },
  {
    name: "get_sales_by_day",
    description:
      "Ventas totales día por día en el período, ordenadas de mayor a menor. Usalo para el mejor día, qué día se vendió más, o comparar días.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_day_detail",
    description:
      "Detalle de UN día puntual: total, desglose por medio de pago y productos vendidos. Usalo para un día específico (ej. el mejor día). La fecha sale de get_sales_by_day (campo fecha_iso).",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Fecha exacta AAAA-MM-DD (ej: 2026-05-23)." },
      },
      required: ["date"],
    },
  },
  {
    name: "get_inventory_analysis",
    description:
      "Análisis de compras/reposición: por cada producto, cuánto se vendió este mes vs el mes pasado (tendencia) y lo facturado. Incluye el mes y la temporada actual y la próxima. Usalo cuando pregunten qué comprar o reponer para el mes/temporada que viene.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "record_expense",
    description:
      "Registra un gasto. Usalo SOLO cuando pida anotar un gasto. Confirmá monto, descripción y si es del negocio o personal antes de llamarlo.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Descripción corta del gasto." },
        amount: { type: "number", description: "Monto en pesos, mayor a cero." },
        category: {
          type: "string",
          description:
            "Categoría. Negocio: Mercadería, Alquiler, Servicios, Impuestos, Marketing, Otros Negocio. Personal: Comida/Súper, Transporte, Ocio/Salidas, Salud, Luz, Agua, Gas, Internet, Otros Personal.",
        },
        type: {
          type: "string",
          enum: ["business", "personal"],
          description: "business = gasto del negocio, personal = gasto personal.",
        },
      },
      required: ["description", "amount", "category", "type"],
    },
  },
  {
    name: "propose_sale",
    description:
      "Prepara UNA venta (un ticket de una clienta) para confirmar. NO la guarda: muestra un cartelito con los datos y se guarda recién cuando la usuaria toca Confirmar. Puede tener varios productos y varios medios de pago (pago combinado). Si en el mismo mensaje hay ventas de clientas DISTINTAS, llamá propose_sale UNA VEZ POR CADA clienta.",
    input_schema: {
      type: "object",
      properties: {
        clientLabel: {
          type: "string",
          description:
            "Opcional. Nombre o referencia de la clienta si lo menciona (ej: 'Marta'). Sirve para distinguir cuando son varias clientas.",
        },
        items: {
          type: "array",
          description: "Los productos de la venta.",
          items: {
            type: "object",
            properties: {
              product: { type: "string", description: "Nombre del producto." },
              price: {
                type: "number",
                description:
                  "Precio que cobra por ESTE producto, tal como lo dicta la usuaria (puede haberlo subido para esa clienta — usalo tal cual, no lo corrijas). En pesos, antes del descuento si lo hubiera.",
              },
              quantity: { type: "integer", description: "Cantidad (por defecto 1)." },
            },
            required: ["product", "price"],
          },
        },
        payments: {
          type: "array",
          description:
            "Cómo pagó. Uno o VARIOS medios (pago combinado). Cada entrada con su monto. La suma debería dar el total final de la venta.",
          items: {
            type: "object",
            properties: {
              method: {
                type: "string",
                enum: ["Efectivo", "Transferencia", "Débito", "Crédito", "Vale"],
                description: "Medio de pago.",
              },
              amount: { type: "number", description: "Monto pagado con este medio, en pesos." },
              installments: {
                type: "integer",
                description: "Cuotas (solo si es Crédito en cuotas). Omitir si es un pago.",
              },
            },
            required: ["method", "amount"],
          },
        },
        discountPercent: {
          type: "number",
          description:
            "Opcional. % de descuento de toda la venta. SOLO si la usuaria lo menciona (a veces hace descuento en efectivo, a veces no). Si no lo dice, omitilo.",
        },
        finalTotal: {
          type: "number",
          description:
            "Opcional. Total final cerrado cuando la usuaria redondea o da un número distinto a la suma de los productos (ej. 'redondealo a 60 mil', 'le dejo todo en 58'). Si lo pasás, ese es el total que se cobra; la diferencia se guarda como ajuste/redondeo.",
        },
      },
      required: ["items", "payments"],
    },
  },
];

// ─────────────────────────── Ejecutor de tools ───────────────────────────
export async function executeTool(
  ctx: ActionCtx,
  userId: string,
  conversationId: Id<"assistantConversations">,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "get_financial_summary": {
        const period = String(input.period ?? "month");
        const s = await ctx.runQuery(internal.assistant.data.financialSummary, {
          userId,
          fromDate: periodFrom(period),
        });
        return JSON.stringify({
          periodo: period,
          ventas: fmt(s.totalSales),
          gastos_negocio: fmt(s.businessExpenses),
          retiros_personales: fmt(s.personalWithdrawals),
          ganancia_negocio: fmt(s.netProfit),
          quedo_en_caja: fmt(s.finalBalance),
          cantidad_ventas: s.salesCount,
        });
      }
      case "get_payment_breakdown": {
        const period = String(input.period ?? "month");
        const rows = await ctx.runQuery(internal.assistant.data.paymentBreakdown, {
          userId,
          fromDate: periodFrom(period),
        });
        if (rows.length === 0) return JSON.stringify({ periodo: period, por_medio: [] });
        const total = rows.reduce((sum, r) => sum + r.amount, 0);
        return JSON.stringify({
          periodo: period,
          por_medio: rows.map((r) => ({ medio: r.method, monto: fmt(r.amount) })),
          total: fmt(total),
        });
      }
      case "get_expenses_breakdown": {
        const period = String(input.period ?? "month");
        const type = input.type as "business" | "personal" | undefined;
        const rows = await ctx.runQuery(internal.assistant.data.expensesByCategory, {
          userId,
          fromDate: periodFrom(period),
          type,
        });
        if (rows.length === 0) return JSON.stringify({ periodo: period, gastos: [] });
        return JSON.stringify({
          periodo: period,
          gastos: rows.map((r) => ({ categoria: r.category, monto: fmt(r.amount) })),
        });
      }
      case "get_top_products": {
        const period = String(input.period ?? "month");
        const limit = typeof input.limit === "number" ? input.limit : 5;
        const rows = await ctx.runQuery(internal.assistant.data.topProducts, {
          userId,
          fromDate: periodFrom(period),
          limit,
        });
        if (rows.length === 0) return JSON.stringify({ periodo: period, productos: [] });
        return JSON.stringify({
          periodo: period,
          productos: rows.map((r) => ({
            producto: r.name,
            facturado: fmt(r.revenue),
            unidades: r.units,
          })),
        });
      }
      case "get_sales_by_day": {
        const period = String(input.period ?? "month");
        const rows = await ctx.runQuery(internal.assistant.data.salesByDay, {
          userId,
          fromDate: periodFrom(period),
        });
        if (rows.length === 0) return JSON.stringify({ periodo: period, dias: [] });
        const toLabel = (d: string) => {
          const [, m, day] = d.split("-");
          return `${parseInt(day, 10)}/${parseInt(m, 10)}`;
        };
        return JSON.stringify({
          periodo: period,
          mejor_dia: {
            fecha: toLabel(rows[0].date),
            fecha_iso: rows[0].date,
            monto: fmt(rows[0].total),
          },
          dias: rows.slice(0, 31).map((r) => ({
            fecha: toLabel(r.date),
            fecha_iso: r.date,
            monto: fmt(r.total),
          })),
        });
      }
      case "get_day_detail": {
        const date = String(input.date ?? "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
          return "Necesito una fecha válida en formato AAAA-MM-DD.";
        const d = await ctx.runQuery(internal.assistant.data.dayDetail, { userId, date });
        return JSON.stringify({
          fecha: date,
          total: fmt(d.total),
          por_medio: d.payments.map((p) => ({ medio: p.method, monto: fmt(p.amount) })),
          productos: d.products.map((p) => ({
            producto: p.name,
            facturado: fmt(p.revenue),
            unidades: p.units,
          })),
        });
      }
      case "get_inventory_analysis": {
        const mc = monthContext();
        const rows = await ctx.runQuery(internal.assistant.data.inventoryAnalysis, {
          userId,
          thisStart: mc.thisStart,
          prevStart: mc.prevStart,
        });
        return JSON.stringify({
          mes_actual: mc.monthLabel,
          temporada_actual: mc.seasonNow,
          proximo_mes: mc.nextMonthLabel,
          temporada_proxima: mc.seasonNext,
          productos: rows.map((r) => ({
            producto: r.name,
            vendido_este_mes: r.unitsNow,
            vendido_mes_pasado: r.unitsPrev,
            facturado_este_mes: fmt(r.revenueNow),
          })),
        });
      }
      case "record_expense": {
        const amount = Number(input.amount);
        const type = input.type === "personal" ? "personal" : "business";
        await ctx.runMutation(internal.assistant.data.recordExpense, {
          userId,
          date: todayAR(),
          description: String(input.description ?? "Gasto"),
          amount,
          category: String(input.category ?? "Otros Negocio"),
          type,
        });
        return `Gasto registrado: ${input.description} por ${fmt(amount)} (${type === "personal" ? "personal" : "negocio"}).`;
      }
      case "propose_sale": {
        const rawItems = Array.isArray(input.items) ? input.items : [];
        const rawPayments = Array.isArray(input.payments) ? input.payments : [];
        if (rawItems.length === 0 || rawPayments.length === 0)
          return "Necesito al menos un producto y un medio de pago para preparar la venta.";
        const disc =
          typeof input.discountPercent === "number" && input.discountPercent > 0
            ? input.discountPercent
            : undefined;
        let itemsTotal = 0;
        const items = (rawItems as any[]).map((it) => {
          const qty = typeof it?.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
          const list = Number(it?.price) || 0;
          const unit = disc ? Math.round(list * (1 - disc / 100)) : list;
          itemsTotal += unit * qty;
          return {
            product: String(it?.product ?? "Producto"),
            quantity: qty,
            price: unit,
            ...(disc ? { listPrice: list } : {}),
          };
        });
        const payments = (rawPayments as any[]).map((p) => ({
          method: String(p?.method ?? "Efectivo"),
          amount: Math.round(Number(p?.amount) || 0),
          ...(typeof p?.installments === "number" && p.installments > 1
            ? { installments: p.installments }
            : {}),
        }));
        const finalTotal =
          typeof input.finalTotal === "number" && input.finalTotal > 0
            ? Math.round(input.finalTotal)
            : undefined;
        const total = finalTotal ?? itemsTotal;
        const clientLabel =
          typeof input.clientLabel === "string" && input.clientLabel.trim()
            ? input.clientLabel.trim()
            : undefined;
        await ctx.runMutation(internal.assistant.sales.createProposalInternal, {
          userId,
          conversationId,
          clientLabel,
          items,
          payments,
          discountPercent: disc,
          total,
        });
        return "Propuesta de venta lista. Decile a la usuaria que revise el cartelito en pantalla y toque Confirmar. NO digas que ya quedó guardada — todavía NO se guardó, se guarda cuando ella confirma.";
      }
      default:
        return `Tool desconocida: ${name}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error desconocido";
    return `Error ejecutando ${name}: ${msg}`;
  }
}
