import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getStableUserId } from "../lib/auth";

/**
 * Crea el perfil "accountant" para un usuario auth recién creado
 * y lo asigna al owner que lo creó.
 */
export const assignAccountant = internalMutation({
  args: {
    authUserId: v.string(),
    callerTokenIdentifier: v.string(),
  },
  handler: async (ctx, { authUserId, callerTokenIdentifier }) => {
    // Encontrar el perfil del owner
    const ownerUserId = getStableUserId(callerTokenIdentifier);
    const ownerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", ownerUserId))
      .first();
    if (!ownerProfile) throw new Error("Owner profile not found");

    // Construir el stableUserId para la contadora
    const domain = callerTokenIdentifier.split("|")[0];
    const accountantStableUserId = `${domain}|${authUserId}`;

    // Crear perfil de contadora (o actualizar si ya existe)
    let accountantProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", accountantStableUserId))
      .first();

    if (accountantProfile) {
      await ctx.db.patch(accountantProfile._id, { role: "accountant" });
    } else {
      const id = await ctx.db.insert("profiles", {
        userId: accountantStableUserId,
        role: "accountant",
      });
      accountantProfile = (await ctx.db.get(id))!;
    }

    // Crear asignación si no existe
    const existing = await ctx.db
      .query("accountantAssignments")
      .withIndex("by_accountant", (q) => q.eq("accountantId", accountantProfile._id))
      .first();

    if (!existing) {
      await ctx.db.insert("accountantAssignments", {
        ownerId: ownerProfile._id,
        accountantId: accountantProfile._id,
      });
    }
  },
});
