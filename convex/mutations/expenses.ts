import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

export const saveExpense = mutation({
  args: {
    id: v.optional(v.id("expenses")),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    category: v.string(),
    type: v.union(v.literal("business"), v.literal("personal")),
    hasInvoiceA: v.boolean(),
    invoiceAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.amount <= 0) throw new Error("Monto inválido");

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.userId !== userId) {
        throw new Error("Gasto no encontrado");
      }
      await ctx.db.patch(args.id, {
        date: args.date,
        description: args.description,
        amount: args.amount,
        category: args.category,
        type: args.type,
        hasInvoiceA: args.hasInvoiceA,
        invoiceAmount: args.invoiceAmount,
      });
    } else {
      await ctx.db.insert("expenses", {
        userId,
        date: args.date,
        description: args.description,
        amount: args.amount,
        category: args.category,
        type: args.type,
        hasInvoiceA: args.hasInvoiceA,
        invoiceAmount: args.invoiceAmount,
      });
    }
  },
});

export const deleteExpense = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Gasto no encontrado");
    }
    await ctx.db.delete(id);
  },
});
