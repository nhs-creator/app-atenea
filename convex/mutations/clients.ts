import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const saveClient = mutation({
  args: {
    id: v.optional(v.id("clients")),
    name: v.string(),
    lastName: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const data = {
      name: args.name.toUpperCase(),
      lastName: args.lastName?.toUpperCase(),
      phone: args.phone,
      email: args.email?.toLowerCase() || undefined,
    };

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.userId !== identity.tokenIdentifier) {
        throw new Error("Cliente no encontrado");
      }
      await ctx.db.patch(args.id, data);
    } else {
      await ctx.db.insert("clients", {
        userId: identity.tokenIdentifier,
        ...data,
        totalSpent: 0,
      });
    }
  },
});

export const deleteClient = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== identity.tokenIdentifier) {
      throw new Error("Cliente no encontrado");
    }
    await ctx.db.delete(id);
  },
});
