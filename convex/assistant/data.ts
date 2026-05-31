import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";

/**
 * Resuelve el userId efectivo del usuario autenticado (maneja el caso contadora
 * → owner). Se llama desde la action del chat, que propaga la identidad auth.
 */
export const whoami = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getEffectiveUserId(ctx);
  },
});

// ─────────────────────────── Tools de lectura ───────────────────────────

/** Resumen financiero del período: ventas, gastos de negocio y retiros personales. */
export const financialSummary = internalQuery({
  args: { userId: v.string(), fromDate: v.string() },
  handler: async (ctx, { userId, fromDate }) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", fromDate)
      )
      .collect();
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", fromDate)
      )
      .collect();

    let totalSales = 0;
    for (const s of sales) {
      if (s.status === "cancelled" || s.status === "returned") continue;
      const price = Number(s.price) || 0;
      const qty = s.quantity || 1;
      totalSales +=
        s.productName === "💰 AJUSTE POR REDONDEO" ? price : price * qty;
    }

    let businessExpenses = 0;
    let personalWithdrawals = 0;
    for (const e of expenses) {
      const amount = Number(e.amount) || 0;
      if (e.type === "personal") personalWithdrawals += amount;
      else businessExpenses += amount;
    }

    return {
      totalSales,
      businessExpenses,
      personalWithdrawals,
      netProfit: totalSales - businessExpenses,
      finalBalance: totalSales - businessExpenses - personalWithdrawals,
      salesCount: sales.length,
      expensesCount: expenses.length,
    };
  },
});

/** Ventas agrupadas por medio de pago en el período. */
export const paymentBreakdown = internalQuery({
  args: { userId: v.string(), fromDate: v.string() },
  handler: async (ctx, { userId, fromDate }) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", fromDate)
      )
      .collect();

    const totals: Record<string, number> = {
      Efectivo: 0,
      Transferencia: 0,
      Débito: 0,
      Crédito: 0,
      Vale: 0,
    };
    // Dedupe por transacción (clientNumber) para no contar dos veces los pagos
    // cuando una venta tiene varias filas de productos.
    const processed = new Set<string>();
    for (const s of sales) {
      if (s.status === "cancelled" || s.status === "returned") continue;
      if (processed.has(s.clientNumber)) continue;
      processed.add(s.clientNumber);
      const details = Array.isArray(s.paymentDetails) ? s.paymentDetails : [];
      if (details.length > 0) {
        for (const p of details) {
          if (totals[p.method] !== undefined)
            totals[p.method] += Number(p.amount) || 0;
        }
      } else {
        const method = s.paymentMethod || "Efectivo";
        const qty = s.quantity || 1;
        const subtotal =
          s.productName === "💰 AJUSTE POR REDONDEO"
            ? Number(s.price) || 0
            : (Number(s.price) || 0) * qty;
        if (totals[method] !== undefined) totals[method] += subtotal;
      }
    }
    return Object.entries(totals)
      .filter(([, amount]) => amount > 0)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  },
});

/** Gastos agrupados por categoría en el período (filtrable por tipo). */
export const expensesByCategory = internalQuery({
  args: {
    userId: v.string(),
    fromDate: v.string(),
    type: v.optional(v.union(v.literal("business"), v.literal("personal"))),
  },
  handler: async (ctx, { userId, fromDate, type }) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", fromDate)
      )
      .collect();

    const totals: Record<string, number> = {};
    for (const e of expenses) {
      if (type && e.type !== type) continue;
      totals[e.category] = (totals[e.category] || 0) + (Number(e.amount) || 0);
    }
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  },
});

/** Productos más vendidos del período, por facturación. */
export const topProducts = internalQuery({
  args: { userId: v.string(), fromDate: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, fromDate, limit }) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", fromDate)
      )
      .collect();

    const byProduct: Record<string, { revenue: number; units: number }> = {};
    for (const s of sales) {
      if (s.status === "cancelled" || s.status === "returned") continue;
      if (s.productName === "💰 AJUSTE POR REDONDEO") continue;
      const qty = s.quantity || 1;
      const revenue = (Number(s.price) || 0) * qty;
      const cur = byProduct[s.productName] || { revenue: 0, units: 0 };
      cur.revenue += revenue;
      cur.units += qty;
      byProduct[s.productName] = cur;
    }
    return Object.entries(byProduct)
      .map(([name, v]) => ({ name, revenue: v.revenue, units: v.units }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit ?? 5);
  },
});

/** Ventas totales por día en el período (para mejor día, comparar días, etc.). */
export const salesByDay = internalQuery({
  args: { userId: v.string(), fromDate: v.string() },
  handler: async (ctx, { userId, fromDate }) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", fromDate)
      )
      .collect();

    const byDay: Record<string, number> = {};
    for (const s of sales) {
      if (s.status === "cancelled" || s.status === "returned") continue;
      const qty = s.quantity || 1;
      const subtotal =
        s.productName === "💰 AJUSTE POR REDONDEO"
          ? Number(s.price) || 0
          : (Number(s.price) || 0) * qty;
      byDay[s.date] = (byDay[s.date] || 0) + subtotal;
    }
    return Object.entries(byDay)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => b.total - a.total);
  },
});

/** Detalle de un día puntual: total, medios de pago y productos vendidos. */
export const dayDetail = internalQuery({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).eq("date", date)
      )
      .collect();

    let total = 0;
    const payments: Record<string, number> = {};
    const products: Record<string, { revenue: number; units: number }> = {};
    const processed = new Set<string>();

    for (const s of sales) {
      if (s.status === "cancelled" || s.status === "returned") continue;
      const qty = s.quantity || 1;
      const subtotal =
        s.productName === "💰 AJUSTE POR REDONDEO"
          ? Number(s.price) || 0
          : (Number(s.price) || 0) * qty;
      total += subtotal;

      if (s.productName !== "💰 AJUSTE POR REDONDEO") {
        const cur = products[s.productName] || { revenue: 0, units: 0 };
        cur.revenue += subtotal;
        cur.units += qty;
        products[s.productName] = cur;
      }

      if (!processed.has(s.clientNumber)) {
        processed.add(s.clientNumber);
        const details = Array.isArray(s.paymentDetails) ? s.paymentDetails : [];
        if (details.length > 0) {
          for (const p of details)
            payments[p.method] = (payments[p.method] || 0) + (Number(p.amount) || 0);
        } else {
          const method = s.paymentMethod || "Efectivo";
          payments[method] = (payments[method] || 0) + subtotal;
        }
      }
    }

    return {
      total,
      payments: Object.entries(payments)
        .filter(([, a]) => a > 0)
        .map(([method, amount]) => ({ method, amount }))
        .sort((a, b) => b.amount - a.amount),
      products: Object.entries(products)
        .map(([name, v]) => ({ name, revenue: v.revenue, units: v.units }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8),
    };
  },
});

/**
 * Análisis para decisiones de compra: por producto, unidades vendidas este
 * período y el anterior (tendencia), facturación y stock actual.
 */
export const inventoryAnalysis = internalQuery({
  args: {
    userId: v.string(),
    thisStart: v.string(),
    prevStart: v.string(),
  },
  handler: async (ctx, { userId, thisStart, prevStart }) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", prevStart)
      )
      .collect();

    type Row = { unitsNow: number; unitsPrev: number; revenueNow: number };
    const byProduct: Record<string, Row> = {};
    for (const s of sales) {
      if (s.status === "cancelled" || s.status === "returned") continue;
      if (s.productName === "💰 AJUSTE POR REDONDEO") continue;
      const qty = s.quantity || 1;
      const revenue = (Number(s.price) || 0) * qty;
      const row = byProduct[s.productName] || {
        unitsNow: 0,
        unitsPrev: 0,
        revenueNow: 0,
      };
      if (s.date >= thisStart) {
        row.unitsNow += qty;
        row.revenueNow += revenue;
      } else {
        row.unitsPrev += qty;
      }
      byProduct[s.productName] = row;
    }

    // Stock actual + categoría por nombre de producto.
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const stockByName = new Map(
      inventory.map((i) => [i.name, { stock: i.stockTotal, category: i.category }])
    );

    return Object.entries(byProduct)
      .map(([name, r]) => {
        const inv = stockByName.get(name);
        return {
          name,
          category: inv?.category ?? "",
          unitsNow: r.unitsNow,
          unitsPrev: r.unitsPrev,
          revenueNow: r.revenueNow,
          stock: inv?.stock ?? null,
        };
      })
      .sort((a, b) => b.unitsNow - a.unitsNow)
      .slice(0, 50);
  },
});

/** Productos con stock por debajo del mínimo. */
export const lowStock = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("inventory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return items
      .filter((i) => i.minStock !== undefined && i.stockTotal <= i.minStock)
      .map((i) => ({
        name: i.name,
        category: i.category,
        stockTotal: i.stockTotal,
        minStock: i.minStock ?? 0,
      }))
      .sort((a, b) => a.stockTotal - b.stockTotal);
  },
});

// ─────────────────────────── Tools de escritura ──────────────────────────

/** Registra un gasto. Lo usa la tool record_expense. */
export const recordExpense = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    category: v.string(),
    type: v.union(v.literal("business"), v.literal("personal")),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) throw new Error("Monto inválido");
    const id = await ctx.db.insert("expenses", {
      userId: args.userId,
      date: args.date,
      description: args.description,
      amount: args.amount,
      category: args.category,
      type: args.type,
      hasInvoiceA: false,
      invoiceAmount: 0,
    });
    return { id };
  },
});

/**
 * Registra una venta rápida (sin descontar inventario). Pensada para cargas por
 * voz/chat. Para ventas con stock + medios de pago detallados se sigue usando el
 * formulario normal.
 */
export const recordSale = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    productName: v.string(),
    quantity: v.number(),
    price: v.number(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.price <= 0 || args.quantity <= 0)
      throw new Error("Precio o cantidad inválidos");
    const id = await ctx.db.insert("sales", {
      userId: args.userId,
      date: args.date,
      clientNumber: `IA-${Date.now()}`,
      productName: args.productName,
      quantity: args.quantity,
      price: args.price,
      paymentMethod: args.paymentMethod,
      paymentDetails: [{ method: args.paymentMethod, amount: args.price * args.quantity }],
      status: "completed",
      notes: "Cargada por el asistente",
    });
    return { id };
  },
});
