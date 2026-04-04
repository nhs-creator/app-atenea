"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

/**
 * El owner crea la cuenta de una contadora (email + password).
 * Usa createAccount de @convex-dev/auth para hashear la password y crear
 * el usuario en las tablas auth. Luego asigna el rol "accountant".
 */
export const createAccountant = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    // 1. Verificar que el caller es owner
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const callerRole: string | null = await ctx.runQuery(
      internal.queries.internal_profiles.getRole,
      { tokenIdentifier: identity.tokenIdentifier }
    );
    if (callerRole !== "owner") {
      throw new Error("Solo el dueño puede crear cuentas");
    }

    // 2. Crear la cuenta auth (hashea password automáticamente)
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email.toLowerCase().trim(), secret: password },
      profile: { email: email.toLowerCase().trim() },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });

    // 3. Crear perfil + asignación como contadora
    await ctx.runMutation(
      internal.mutations.internal_profiles.assignAccountant,
      { authUserId: user._id, callerTokenIdentifier: identity.tokenIdentifier }
    );

    return { success: true };
  },
});
