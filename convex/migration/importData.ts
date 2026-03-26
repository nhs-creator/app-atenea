"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

// ============================================================================
// Helper: Fetch from Supabase REST API
// ============================================================================
async function supabaseFetch(table: string, params: string = "") {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(
    `${url}/rest/v1/${table}?select=*${params ? "&" + params : ""}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase fetch ${table} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

// ============================================================================
// Main migration action
// ============================================================================
export const runMigration = action({
  args: {
    convexUserId: v.string(),
  },
  handler: async (ctx, { convexUserId }) => {
    const log = (msg: string) => console.log(`[MIGRATION] ${msg}`);

    // 0. Clear existing data (order: dependents first)
    log("Clearing existing data...");
    const tablesToClear = [
      "inventoryMovements", "inventoryPriceHistory", "sales",
      "vouchers", "expenses", "inventory", "clients",
    ];
    for (const table of tablesToClear) {
      const deleted: number = await ctx.runMutation(internal.migration.importMutations.clearTable, { table });
      if (deleted > 0) log(`  Cleared ${deleted} rows from ${table}`);
    }
    log("Data cleared.");

    const clientMap = new Map<string, Id<"clients">>();
    const inventoryMap = new Map<string, Id<"inventory">>();

    // 1. Clients
    log("Fetching clients...");
    const sbClients = await supabaseFetch("clients", "order=name.asc");
    log(`Found ${sbClients.length} clients`);

    for (const c of sbClients) {
      const convexId = await ctx.runMutation(internal.migration.importMutations.insertClient, {
        userId: convexUserId,
        name: c.name || "",
        lastName: c.last_name || undefined,
        phone: c.phone || "",
        email: c.email || undefined,
        totalSpent: Number(c.total_spent) || 0,
        lastPurchaseDate: c.last_purchase_date || undefined,
        supabaseId: c.id,
      });
      clientMap.set(c.id, convexId);
    }
    log(`Imported ${clientMap.size} clients`);

    // 2. Inventory
    log("Fetching inventory...");
    const sbInventory = await supabaseFetch("inventory", "order=name.asc");
    log(`Found ${sbInventory.length} inventory items`);

    // Convex record keys must be ASCII-only. Sanitize non-ASCII chars.
    const sanitizeKey = (key: string) => key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "_");

    for (const i of sbInventory) {
      const sizes: Record<string, number> = {};
      if (i.sizes && typeof i.sizes === "object") {
        for (const [k, val] of Object.entries(i.sizes)) {
          sizes[sanitizeKey(k)] = Number(val) || 0;
        }
      }
      const stockTotal = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);

      const convexId = await ctx.runMutation(internal.migration.importMutations.insertInventory, {
        userId: convexUserId,
        name: i.name || "",
        category: i.category || "",
        subcategory: i.subcategory || undefined,
        material: i.material || undefined,
        costPrice: Number(i.cost_price) || 0,
        sellingPrice: Number(i.selling_price) || 0,
        sizes,
        stockTotal,
        sku: i.sku || undefined,
        barcode: i.barcode || undefined,
        supabaseId: i.id,
      });
      inventoryMap.set(i.id, convexId);
    }
    log(`Imported ${inventoryMap.size} inventory items`);

    // 3. Expenses
    log("Fetching expenses...");
    const sbExpenses = await supabaseFetch("expenses", "order=date.desc");
    log(`Found ${sbExpenses.length} expenses`);

    let expenseCount = 0;
    for (const e of sbExpenses) {
      const expenseType = e.type === "personal" ? "personal" as const : "business" as const;
      await ctx.runMutation(internal.migration.importMutations.insertExpense, {
        userId: convexUserId,
        date: e.date,
        description: e.description || "",
        amount: Number(e.amount) || 0,
        category: e.category || "",
        type: expenseType,
        hasInvoiceA: e.has_invoice_a || false,
        invoiceAmount: Number(e.invoice_amount) || 0,
        supabaseId: e.id,
      });
      expenseCount++;
    }
    log(`Imported ${expenseCount} expenses`);

    // 4. Vouchers
    log("Fetching vouchers...");
    const sbVouchers = await supabaseFetch("vouchers", "order=created_at.desc");
    log(`Found ${sbVouchers.length} vouchers`);

    let voucherCount = 0;
    for (const v of sbVouchers) {
      const status = v.status === "used" ? "used" as const
        : v.status === "expired" ? "expired" as const
        : "active" as const;

      await ctx.runMutation(internal.migration.importMutations.insertVoucher, {
        userId: convexUserId,
        code: v.code,
        initialAmount: Number(v.initial_amount) || 0,
        currentAmount: Number(v.current_amount) || 0,
        status,
        clientId: v.client_id ? clientMap.get(v.client_id) : undefined,
        expiresAt: v.expires_at || new Date().toISOString(),
        supabaseId: v.id,
      });
      voucherCount++;
    }
    log(`Imported ${voucherCount} vouchers`);

    // 5. Sales
    log("Fetching sales...");
    const sbSales = await supabaseFetch("sales", "order=date.desc,client_number.desc");
    log(`Found ${sbSales.length} sales`);

    let saleCount = 0;
    const validStatuses = ["completed", "pending", "cancelled", "returned", "exchanged"];

    for (const s of sbSales) {
      const status = validStatuses.includes(s.status) ? s.status : "completed";

      let paymentDetails: any[] = [];
      try {
        if (typeof s.payment_details === "string") {
          paymentDetails = JSON.parse(s.payment_details);
        } else if (Array.isArray(s.payment_details)) {
          paymentDetails = s.payment_details;
        }
      } catch {
        paymentDetails = [];
      }
      // Sanitize: convert null fields to undefined (Convex doesn't accept null for optional fields)
      paymentDetails = paymentDetails.map((p: any) => ({
        method: p.method || "Efectivo",
        amount: Number(p.amount) || 0,
        ...(p.installments != null ? { installments: Number(p.installments) } : {}),
        ...(p.voucherCode != null ? { voucherCode: String(p.voucherCode) } : {}),
        ...(p.appliedToItems != null ? { appliedToItems: p.appliedToItems } : {}),
        ...(p.roundingBase != null ? { roundingBase: p.roundingBase } : {}),
      }));

      await ctx.runMutation(internal.migration.importMutations.insertSale, {
        userId: convexUserId,
        date: s.date,
        clientNumber: s.client_number,
        productName: s.product_name || "",
        quantity: s.quantity || 1,
        size: s.size || undefined,
        price: Number(s.price) || 0,
        listPrice: s.list_price != null ? Number(s.list_price) : undefined,
        costPrice: s.cost_price != null ? Number(s.cost_price) : undefined,
        paymentMethod: s.payment_method || "Efectivo",
        paymentDetails,
        status,
        notes: s.notes || undefined,
        expiresAt: s.expires_at || undefined,
        inventoryId: s.inventory_id ? inventoryMap.get(s.inventory_id) : undefined,
        clientId: s.client_id ? clientMap.get(s.client_id) : undefined,
        supabaseId: s.id,
      });
      saleCount++;
    }
    log(`Imported ${saleCount} sales`);

    // 6. Inventory Movements
    log("Fetching inventory movements...");
    const sbMovements = await supabaseFetch("inventory_movements", "order=created_at.desc");
    log(`Found ${sbMovements.length} movements`);

    let movementCount = 0;
    const validMovementTypes = ["sale", "return", "restock", "adjustment", "transfer_in", "transfer_out", "initial", "cancel"];

    for (const m of sbMovements) {
      const invId = inventoryMap.get(m.inventory_id);
      if (!invId) continue;

      const movementType = validMovementTypes.includes(m.movement_type)
        ? m.movement_type
        : "adjustment";

      await ctx.runMutation(internal.migration.importMutations.insertMovement, {
        inventoryId: invId,
        userId: convexUserId,
        movementType,
        size: m.size || "U",
        quantityChange: m.quantity_change || 0,
        quantityBefore: m.quantity_before || 0,
        quantityAfter: m.quantity_after || 0,
        referenceType: m.reference_type || undefined,
        referenceId: m.reference_id || undefined,
        notes: m.notes || undefined,
      });
      movementCount++;
    }
    log(`Imported ${movementCount} movements`);

    // Summary
    const summary = {
      clients: clientMap.size,
      inventory: inventoryMap.size,
      expenses: expenseCount,
      vouchers: voucherCount,
      sales: saleCount,
      movements: movementCount,
    };
    log(`Migration complete! ${JSON.stringify(summary)}`);

    return summary;
  },
});
