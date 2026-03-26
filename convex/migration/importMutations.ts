import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// ============================================================================
// Clear all data before migration
// ============================================================================
export const clearTable = internalMutation({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    const docs = await ctx.db.query(table as any).collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return docs.length;
  },
});

// ============================================================================
// Insert mutations
// ============================================================================
export const insertClient = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    lastName: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
    totalSpent: v.number(),
    lastPurchaseDate: v.optional(v.string()),
    supabaseId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("clients", args);
  },
});

export const insertInventory = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    material: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    sizes: v.record(v.string(), v.number()),
    stockTotal: v.number(),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
    supabaseId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("inventory", args);
  },
});

export const insertExpense = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    category: v.string(),
    type: v.union(v.literal("business"), v.literal("personal")),
    hasInvoiceA: v.boolean(),
    invoiceAmount: v.number(),
    supabaseId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("expenses", args);
  },
});

export const insertVoucher = internalMutation({
  args: {
    userId: v.string(),
    code: v.string(),
    initialAmount: v.number(),
    currentAmount: v.number(),
    status: v.union(v.literal("active"), v.literal("used"), v.literal("expired")),
    clientId: v.optional(v.id("clients")),
    expiresAt: v.string(),
    supabaseId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("vouchers", args);
  },
});

export const insertSale = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    clientNumber: v.string(),
    productName: v.string(),
    quantity: v.number(),
    size: v.optional(v.string()),
    price: v.number(),
    listPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    paymentMethod: v.string(),
    paymentDetails: v.array(v.any()),
    status: v.union(
      v.literal("completed"), v.literal("pending"),
      v.literal("cancelled"), v.literal("returned"), v.literal("exchanged"),
    ),
    notes: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    inventoryId: v.optional(v.id("inventory")),
    clientId: v.optional(v.id("clients")),
    supabaseId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("sales", args);
  },
});

export const insertMovement = internalMutation({
  args: {
    inventoryId: v.id("inventory"),
    userId: v.string(),
    movementType: v.union(
      v.literal("sale"), v.literal("return"), v.literal("restock"),
      v.literal("adjustment"), v.literal("transfer_in"),
      v.literal("transfer_out"), v.literal("initial"), v.literal("cancel"),
    ),
    size: v.string(),
    quantityChange: v.number(),
    quantityBefore: v.number(),
    quantityAfter: v.number(),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("inventoryMovements", args);
  },
});
