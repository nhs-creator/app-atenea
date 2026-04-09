import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId, getEffectiveUserId } from "../lib/auth";

// Datos por defecto de la escala AFIP — los provee la dueña una vez al inicializar.
// Cada fila tiene los 12 campos: letra, máx facturación anual, sup, electricidad, alquiler,
// precio unitario máx, impuesto servicios, impuesto venta de muebles, sipa, obra social, total servicios, total venta de muebles.
const DEFAULT_CATEGORIES = [
  { letter: "A", order: 0, maxBilling: 10277988.13, surfaceLimit: "Hasta 30 m2", electricityLimit: "Hasta 3330 Kw", rentLimit: 2390229.80, unitPriceLimit: 613492.31, taxServices: 4780.46, taxGoods: 4780.46, sipa: 15616.17, obraSocial: 21990.11, totalServices: 42386.74, totalGoods: 42386.74 },
  { letter: "B", order: 1, maxBilling: 15058447.71, surfaceLimit: "Hasta 45 m2", electricityLimit: "Hasta 5000 Kw", rentLimit: 2390229.80, unitPriceLimit: 613492.31, taxServices: 9082.88, taxGoods: 9082.88, sipa: 17177.79, obraSocial: 21990.11, totalServices: 48250.78, totalGoods: 48250.78 },
  { letter: "C", order: 2, maxBilling: 21113696.52, surfaceLimit: "Hasta 60 m2", electricityLimit: "Hasta 6700 Kw", rentLimit: 3266647.39, unitPriceLimit: 613492.31, taxServices: 15616.17, taxGoods: 14341.38, sipa: 18895.57, obraSocial: 21990.11, totalServices: 56501.85, totalGoods: 55227.06 },
  { letter: "D", order: 3, maxBilling: 26212853.42, surfaceLimit: "Hasta 85 m2", electricityLimit: "Hasta 10000 Kw", rentLimit: 3266647.39, unitPriceLimit: 613492.31, taxServices: 25495.79, taxGoods: 23742.95, sipa: 20785.13, obraSocial: 26133.18, totalServices: 72414.10, totalGoods: 70661.26 },
  { letter: "E", order: 4, maxBilling: 30833964.37, surfaceLimit: "Hasta 110 m2", electricityLimit: "Hasta 13000 Kw", rentLimit: 4143064.98, unitPriceLimit: 613492.31, taxServices: 47804.60, taxGoods: 37924.98, sipa: 22863.64, obraSocial: 31869.73, totalServices: 102537.97, totalGoods: 92658.35 },
  { letter: "F", order: 5, maxBilling: 38642048.36, surfaceLimit: "Hasta 150 m2", electricityLimit: "Hasta 16500 Kw", rentLimit: 4143064.98, unitPriceLimit: 613492.31, taxServices: 67245.13, taxGoods: 49398.08, sipa: 25150.00, obraSocial: 36650.19, totalServices: 129045.32, totalGoods: 111198.27 },
  { letter: "G", order: 6, maxBilling: 46211109.37, surfaceLimit: "Hasta 200 m2", electricityLimit: "Hasta 20000 Kw", rentLimit: 4939808.23, unitPriceLimit: 613492.31, taxServices: 122379.76, taxGoods: 61189.87, sipa: 35210.00, obraSocial: 39518.47, totalServices: 197108.23, totalGoods: 135918.34 },
  { letter: "H", order: 7, maxBilling: 70113407.33, surfaceLimit: "Hasta 200 m2", electricityLimit: "Hasta 20000 Kw", rentLimit: 7170689.39, unitPriceLimit: 613492.31, taxServices: 350567.04, taxGoods: 175283.51, sipa: 49294.00, obraSocial: 47485.89, totalServices: 447346.93, totalGoods: 272063.40 },
  { letter: "I", order: 8, maxBilling: 78479211.62, surfaceLimit: "Hasta 200 m2", electricityLimit: "Hasta 20000 Kw", rentLimit: 7170689.39, unitPriceLimit: 613492.31, taxServices: 697150.35, taxGoods: 278860.14, sipa: 69011.60, obraSocial: 58640.31, totalServices: 824802.26, totalGoods: 406512.05 },
  { letter: "J", order: 9, maxBilling: 89872640.30, surfaceLimit: "Hasta 200 m2", electricityLimit: "Hasta 20000 Kw", rentLimit: 7170689.39, unitPriceLimit: 613492.31, taxServices: 836580.42, taxGoods: 334632.18, sipa: 96616.24, obraSocial: 65810.99, totalServices: 999007.65, totalGoods: 497059.41 },
  { letter: "K", order: 10, maxBilling: 108357084.05, surfaceLimit: "Hasta 200 m2", electricityLimit: "Hasta 20000 Kw", rentLimit: 7170689.39, unitPriceLimit: 613492.31, taxServices: 1171212.59, taxGoods: 390404.20, sipa: 135262.74, obraSocial: 75212.57, totalServices: 1381687.90, totalGoods: 600879.51 },
];

/**
 * Inicializa la escala con los valores AFIP por defecto. Solo el dueño.
 * Idempotente: si ya hay categorías, no hace nada.
 */
export const seedDefaultCategories = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile || profile.role !== "owner") {
      throw new Error("Solo el dueño puede inicializar la escala");
    }

    const existing = await ctx.db
      .query("monotributoCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return { seeded: false, count: 0 };

    let count = 0;
    for (const cat of DEFAULT_CATEGORIES) {
      await ctx.db.insert("monotributoCategories", {
        userId,
        ...cat,
      });
      count++;
    }
    return { seeded: true, count };
  },
});

/**
 * Edita los campos numéricos de una categoría. Solo el dueño.
 */
export const updateCategory = mutation({
  args: {
    id: v.id("monotributoCategories"),
    maxBilling: v.optional(v.number()),
    rentLimit: v.optional(v.number()),
    unitPriceLimit: v.optional(v.number()),
    taxGoods: v.optional(v.number()),
    sipa: v.optional(v.number()),
    obraSocial: v.optional(v.number()),
    totalGoods: v.optional(v.number()),
    surfaceLimit: v.optional(v.string()),
    electricityLimit: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile || profile.role !== "owner") {
      throw new Error("Solo el dueño puede editar la escala");
    }

    const cat = await ctx.db.get(id);
    if (!cat || cat.userId !== userId) throw new Error("Categoría no encontrada");

    const cleanPatch: Record<string, any> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) cleanPatch[k] = v;
    }
    if (Object.keys(cleanPatch).length > 0) {
      await ctx.db.patch(id, cleanPatch);
    }
  },
});

/**
 * Cambia la letra de la categoría actual del dueño.
 */
export const setCurrentCategory = mutation({
  args: { letter: v.string() },
  handler: async (ctx, { letter }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found");
    if (profile.role !== "owner") throw new Error("Solo el dueño puede cambiar la categoría actual");

    await ctx.db.patch(profile._id, { monotributoCategory: letter });
  },
});

/**
 * Crea o actualiza el "facturado" manual de un mes específico.
 * Tanto el dueño como la contadora asignada pueden editar este valor.
 * El registro se guarda contra el userId del owner (vía getEffectiveUserId).
 */
export const upsertMonthlyBilling = mutation({
  args: {
    yearMonth: v.string(),
    facturado: v.number(),
  },
  handler: async (ctx, { yearMonth, facturado }) => {
    const targetUserId = await getEffectiveUserId(ctx);
    if (!targetUserId) throw new Error("Not authenticated");

    // Validar formato YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new Error("yearMonth debe tener formato YYYY-MM");
    }

    const existing = await ctx.db
      .query("monthlyBilling")
      .withIndex("by_userId_yearMonth", (q) =>
        q.eq("userId", targetUserId).eq("yearMonth", yearMonth)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { facturado });
    } else {
      await ctx.db.insert("monthlyBilling", {
        userId: targetUserId,
        yearMonth,
        facturado,
      });
    }
  },
});
