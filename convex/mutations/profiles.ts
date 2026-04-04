import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

export const updateProfile = mutation({
  args: {
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Perfil no encontrado");

    await ctx.db.patch(profile._id, {
      storeName: args.storeName,
    });
  },
});

/**
 * Auto-crea perfil la primera vez que un usuario se autentica.
 * Si es el primer perfil del sistema, se asigna "owner".
 * Cualquier otro usuario queda "pending" hasta que el owner lo asigne.
 */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) return existing._id;

    // Si no hay ningún perfil, este es el dueño
    const anyProfile = await ctx.db.query("profiles").first();
    const role = anyProfile ? "pending" : "owner";

    return await ctx.db.insert("profiles", {
      userId,
      role,
    });
  },
});


/** El owner quita una contadora. */
export const removeAccountant = mutation({
  args: { accountantProfileId: v.id("profiles") },
  handler: async (ctx, { accountantProfileId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!myProfile || myProfile.role !== "owner") {
      throw new Error("Solo el dueño puede gestionar contadoras");
    }

    const assignment = await ctx.db
      .query("accountantAssignments")
      .withIndex("by_accountant", (q) => q.eq("accountantId", accountantProfileId))
      .first();

    if (assignment && assignment.ownerId === myProfile._id) {
      await ctx.db.delete(assignment._id);
    }

    await ctx.db.patch(accountantProfileId, { role: "owner" });
  },
});
