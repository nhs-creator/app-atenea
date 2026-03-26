import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const paymentDetailValidator = v.object({
  method: v.string(),
  amount: v.number(),
  installments: v.optional(v.number()),
  voucherCode: v.optional(v.string()),
  appliedToItems: v.optional(v.array(v.string())),
  roundingBase: v.optional(v.union(
    v.literal(100), v.literal(500), v.literal(1000), v.null()
  )),
});

export default defineSchema({
  // --- Convex Auth tables ---
  ...authTables,

  // --- App: Profiles ---
  profiles: defineTable({
    userId: v.string(),
    storeName: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("accountant")),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_supabaseId", ["supabaseId"]),

  accountantAssignments: defineTable({
    ownerId: v.id("profiles"),
    accountantId: v.id("profiles"),
  })
    .index("by_owner", ["ownerId"])
    .index("by_accountant", ["accountantId"]),

  // --- Clients ---
  clients: defineTable({
    userId: v.string(),
    name: v.string(),
    lastName: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
    totalSpent: v.number(),
    lastPurchaseDate: v.optional(v.string()),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Inventory ---
  inventory: defineTable({
    userId: v.string(),
    name: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    material: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    sizes: v.record(v.string(), v.number()),
    stockTotal: v.number(),
    minStock: v.optional(v.number()),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"])
    .index("by_userId_category", ["userId", "category"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Sales ---
  sales: defineTable({
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
    paymentDetails: v.array(paymentDetailValidator),
    status: v.union(
      v.literal("completed"),
      v.literal("pending"),
      v.literal("cancelled"),
      v.literal("returned"),
      v.literal("exchanged"),
    ),
    notes: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    inventoryId: v.optional(v.id("inventory")),
    clientId: v.optional(v.id("clients")),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId_clientNumber", ["userId", "clientNumber"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_clientId", ["clientId"])
    .index("by_inventoryId", ["inventoryId"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Expenses ---
  expenses: defineTable({
    userId: v.string(),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    category: v.string(),
    type: v.union(v.literal("business"), v.literal("personal")),
    hasInvoiceA: v.boolean(),
    invoiceAmount: v.number(),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId_type", ["userId", "type"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Vouchers ---
  vouchers: defineTable({
    userId: v.string(),
    code: v.string(),
    initialAmount: v.number(),
    currentAmount: v.number(),
    status: v.union(
      v.literal("active"), v.literal("used"), v.literal("expired")
    ),
    clientId: v.optional(v.id("clients")),
    expiresAt: v.string(),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId_status", ["userId", "status"])
    .index("by_code", ["code"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Inventory Movements (Audit Trail) ---
  inventoryMovements: defineTable({
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
  })
    .index("by_inventoryId", ["inventoryId"])
    .index("by_userId", ["userId"]),

  // --- Inventory Price History ---
  inventoryPriceHistory: defineTable({
    inventoryId: v.id("inventory"),
    costPrice: v.number(),
    sellingPrice: v.number(),
    changedBy: v.optional(v.string()),
  })
    .index("by_inventoryId", ["inventoryId"]),

  // --- User Config (optional: sync across devices) ---
  userConfig: defineTable({
    userId: v.string(),
    categories: v.array(v.string()),
    subcategories: v.record(v.string(), v.array(v.string())),
    materials: v.array(v.string()),
    sizeSystems: v.record(v.string(), v.array(v.string())),
    categorySizeMap: v.record(v.string(), v.string()),
    openDays: v.array(v.number()),
  })
    .index("by_userId", ["userId"]),
});
