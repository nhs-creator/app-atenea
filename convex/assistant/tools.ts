import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
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

/** Devuelve la fecha de corte (inclusive) para un período. */
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
  // month (por defecto): desde el día 1 del mes actual
  return arDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

const PERIOD_PROP = {
  type: "string",
  enum: ["today", "yesterday", "week", "month"],
  description:
    "Período a consultar: today (hoy), yesterday (ayer), week (últimos 7 días), month (mes actual desde el día 1).",
};

// ─────────────────────────── Definiciones de tools ───────────────────────
// Esquema en el formato de la Messages API de Anthropic.
export const TOOL_DEFS = [
  {
    name: "get_financial_summary",
    description:
      "Devuelve el resumen financiero del período: ventas totales, gastos del negocio, retiros personales, ganancia del negocio y lo que quedó en caja. Usalo cuando pregunten cuánto se vendió, cuánto se gastó, cuánto quedó o cómo viene el negocio.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_payment_breakdown",
    description:
      "Devuelve cuánto se vendió por cada medio de pago (Efectivo, Transferencia, Débito, Crédito) en el período. Usalo cuando pregunten cuánto entró por efectivo, por transferencia, por tarjeta, o el desglose por medio de pago.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_expenses_breakdown",
    description:
      "Devuelve los gastos agrupados por categoría en el período. Usalo cuando pregunten en qué se gastó la plata o cuánto se gastó en una categoría puntual.",
    input_schema: {
      type: "object",
      properties: {
        period: PERIOD_PROP,
        type: {
          type: "string",
          enum: ["business", "personal"],
          description:
            "Opcional. business = gastos del negocio, personal = gastos/retiros personales. Si se omite, incluye todos.",
        },
      },
      required: ["period"],
    },
  },
  {
    name: "get_top_products",
    description:
      "Devuelve los productos más vendidos del período por facturación. Usalo cuando pregunten qué se vende más o cuáles son los productos top.",
    input_schema: {
      type: "object",
      properties: {
        period: PERIOD_PROP,
        limit: { type: "integer", description: "Cuántos productos devolver (por defecto 5)." },
      },
      required: ["period"],
    },
  },
  {
    name: "get_sales_by_day",
    description:
      "Devuelve las ventas totales día por día en el período, ordenadas de mayor a menor. Usalo cuando pregunten cuál fue el mejor día, qué día se vendió más, o para comparar días.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_low_stock",
    description:
      "Devuelve los productos con stock por debajo del mínimo configurado. Usalo cuando pregunten qué falta reponer o qué se está por quedar sin stock.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "record_expense",
    description:
      "Registra un gasto nuevo. Usalo SOLO cuando la usuaria pida explícitamente anotar/cargar un gasto. Antes de llamarlo confirmá el monto, la descripción y si es del negocio o personal.",
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
    name: "record_sale",
    description:
      "Registra una venta rápida (no descuenta stock). Usalo SOLO cuando la usuaria pida explícitamente anotar una venta por el chat. Confirmá producto, precio, cantidad y medio de pago antes de llamarlo.",
    input_schema: {
      type: "object",
      properties: {
        productName: { type: "string", description: "Nombre del producto vendido." },
        price: { type: "number", description: "Precio unitario en pesos." },
        quantity: { type: "integer", description: "Cantidad (por defecto 1)." },
        paymentMethod: {
          type: "string",
          enum: ["Efectivo", "Transferencia", "Débito", "Crédito"],
          description: "Medio de pago.",
        },
      },
      required: ["productName", "price", "paymentMethod"],
    },
  },
];

// ─────────────────────────── Ejecutor de tools ───────────────────────────
export async function executeTool(
  ctx: ActionCtx,
  userId: string,
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
        const rows = await ctx.runQuery(
          internal.assistant.data.paymentBreakdown,
          { userId, fromDate: periodFrom(period) }
        );
        if (rows.length === 0)
          return JSON.stringify({ periodo: period, por_medio: [] });
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
        const rows = await ctx.runQuery(
          internal.assistant.data.expensesByCategory,
          { userId, fromDate: periodFrom(period), type }
        );
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
        if (rows.length === 0)
          return JSON.stringify({ periodo: period, productos: [] });
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
        if (rows.length === 0)
          return JSON.stringify({ periodo: period, dias: [] });
        const toLabel = (d: string) => {
          const [, m, day] = d.split("-");
          return `${parseInt(day, 10)}/${parseInt(m, 10)}`;
        };
        return JSON.stringify({
          periodo: period,
          mejor_dia: { fecha: toLabel(rows[0].date), monto: fmt(rows[0].total) },
          dias: rows
            .slice(0, 31)
            .map((r) => ({ fecha: toLabel(r.date), monto: fmt(r.total) })),
        });
      }
      case "get_low_stock": {
        const rows = await ctx.runQuery(internal.assistant.data.lowStock, { userId });
        if (rows.length === 0)
          return "No hay productos por debajo del stock mínimo.";
        return JSON.stringify({
          faltantes: rows.map((r) => ({
            producto: r.name,
            stock: r.stockTotal,
            minimo: r.minStock,
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
      case "record_sale": {
        const price = Number(input.price);
        const quantity =
          typeof input.quantity === "number" ? input.quantity : 1;
        await ctx.runMutation(internal.assistant.data.recordSale, {
          userId,
          date: todayAR(),
          productName: String(input.productName ?? "Venta"),
          quantity,
          price,
          paymentMethod: String(input.paymentMethod ?? "Efectivo"),
        });
        return `Venta registrada: ${quantity}x ${input.productName} a ${fmt(price)} c/u (${input.paymentMethod}).`;
      }
      default:
        return `Tool desconocida: ${name}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error desconocido";
    return `Error ejecutando ${name}: ${msg}`;
  }
}
