import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateProfile = mutation({
  args: {
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    if (!profile) throw new Error("Perfil no encontrado");

    await ctx.db.patch(profile._id, {
      storeName: args.storeName,
    });
  },
});
