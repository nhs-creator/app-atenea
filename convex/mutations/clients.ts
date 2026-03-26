import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

export const saveClient = mutation({
  args: {
    id: v.optional(v.id("clients")),
    name: v.string(),
    lastName: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const data = {
      name: args.name.toUpperCase(),
      lastName: args.lastName?.toUpperCase(),
      phone: args.phone,
      email: args.email?.toLowerCase() || undefined,
    };

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.userId !== userId) {
        throw new Error("Cliente no encontrado");
      }
      await ctx.db.patch(args.id, data);
    } else {
      await ctx.db.insert("clients", {
        userId,
        ...data,
        totalSpent: 0,
      });
    }
  },
});

export const deleteClient = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Cliente no encontrado");
    }
    await ctx.db.delete(id);
  },
});
