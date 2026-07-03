import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";
import {
  validateCuit,
  validatePuntoVenta,
  validateRazonSocial,
  validateCondicionIva,
  validateIsoDate,
} from "../lib/afipValidators";

/**
 * upsertConfig: crea o actualiza la configuración AFIP del comercio. Solo dueña.
 * Valida formatos antes de persistir para que cualquier error salte acá en vez
 * de dentro del SDK al emitir una factura real.
 */
export const upsertConfig = mutation({
  args: {
    cuit: v.number(),
    puntoVenta: v.number(),
    razonSocial: v.string(),
    nombreFantasia: v.optional(v.string()),
    domicilioComercial: v.string(),
    condicionIva: v.number(),
    inicioActividades: v.string(),
    iibb: v.optional(v.string()),
    isProduction: v.boolean(),
    certExpiration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile || profile.role !== "owner") {
      throw new Error("Solo el dueño puede configurar AFIP");
    }

    validateCuit(args.cuit);
    validatePuntoVenta(args.puntoVenta);
    validateRazonSocial(args.razonSocial);
    validateCondicionIva(args.condicionIva);
    validateIsoDate(args.inicioActividades, "inicioActividades");
    if (args.certExpiration) {
      validateIsoDate(args.certExpiration, "certExpiration");
    }

    const existing = await ctx.db
      .query("afipConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("afipConfig", { userId, ...args });
  },
});
