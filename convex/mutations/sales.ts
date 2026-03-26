import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { computeNextSemanticId } from "../lib/semanticId";
import { deductStock, restoreStock, syncClientStats } from "../lib/stockHelpers";

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

const saleItemValidator = v.object({
  product: v.string(),
  quantity: v.number(),
  listPrice: v.number(),
  finalPrice: v.number(),
  size: v.string(),
  inventoryId: v.optional(v.string()),
  costPrice: v.number(),
  isReturn: v.boolean(),
});

/**
 * Transacción atómica de venta multi-item.
 * Reemplaza el RPC save_multi_sale de PostgreSQL.
 * En Convex, toda mutation es una transacción — si falla, todo se revierte.
 */
export const saveMultiSale = mutation({
  args: {
    date: v.string(),
    items: v.array(saleItemValidator),
    payments: v.array(paymentDetailValidator),
    clientId: v.optional(v.string()),
    clientDraft: v.optional(v.object({
      name: v.string(),
      lastName: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
    })),
    isEdit: v.boolean(),
    originalClientNumber: v.optional(v.string()),
    forceCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;

    // ================================================================
    // 1. Crear cliente si es nuevo
    // ================================================================
    let finalClientId: Id<"clients"> | undefined = args.clientId
      ? (args.clientId as Id<"clients">)
      : undefined;

    if (args.clientDraft && !finalClientId) {
      finalClientId = await ctx.db.insert("clients", {
        userId,
        name: args.clientDraft.name.toUpperCase(),
        lastName: args.clientDraft.lastName.toUpperCase(),
        phone: args.clientDraft.phone,
        email: args.clientDraft.email?.toLowerCase(),
        totalSpent: 0,
      });
    }

    // ================================================================
    // 2. Calcular totales
    // ================================================================
    const cartTotal = args.items.reduce(
      (sum, i) => sum + i.finalPrice * i.quantity, 0
    );
    const totalPaid = args.payments.reduce((sum, p) => sum + p.amount, 0);
    const roundingDiff = totalPaid - cartTotal;
    const isPending = totalPaid < cartTotal + roundingDiff && !args.forceCompleted;

    // ================================================================
    // 3. Generar voucher si saldo negativo
    // ================================================================
    let generatedVoucher: { code: string; amount: number; expiresAt: string } | null = null;

    if (totalPaid < 0 || cartTotal + roundingDiff < 0) {
      const datePart = args.date.replace(/-/g, "").slice(2);
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const code = `VALE-${datePart}-${randomSuffix}`;
      const amount = Math.abs(totalPaid);
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      await ctx.db.insert("vouchers", {
        userId,
        code,
        initialAmount: amount,
        currentAmount: amount,
        status: "active",
        expiresAt,
        clientId: finalClientId,
      });

      generatedVoucher = { code, amount, expiresAt };
    }

    // ================================================================
    // 4. Marcar vales usados
    // ================================================================
    for (const p of args.payments) {
      if (p.method === "Vale" && p.voucherCode) {
        const voucher = await ctx.db
          .query("vouchers")
          .withIndex("by_code", (q) => q.eq("code", p.voucherCode!))
          .first();

        if (voucher && voucher.userId === userId) {
          await ctx.db.patch(voucher._id, {
            status: "used",
            currentAmount: 0,
          });
        }
      }
    }

    // ================================================================
    // 5. Generar ID semántico
    // ================================================================
    let semanticId = args.originalClientNumber || "";

    if (!args.isEdit) {
      const todaySales = await ctx.db
        .query("sales")
        .withIndex("by_userId_date", (q) =>
          q.eq("userId", userId).eq("date", args.date)
        )
        .collect();

      const existingNumbers = [...new Set(todaySales.map((s) => s.clientNumber))];
      semanticId = computeNextSemanticId(existingNumbers, args.date, {
        isReturn: args.items.some((i) => i.isReturn),
        isPending,
      });
    }

    // ================================================================
    // 6. Si es edición → cancelar y eliminar ventas viejas
    // ================================================================
    if (args.isEdit && args.originalClientNumber) {
      const oldSales = await ctx.db
        .query("sales")
        .withIndex("by_userId_clientNumber", (q) =>
          q.eq("userId", userId).eq("clientNumber", args.originalClientNumber!)
        )
        .collect();

      // Restaurar stock de ventas completadas
      for (const sale of oldSales) {
        if (sale.status === "completed" && sale.inventoryId && sale.size) {
          await restoreStock(
            ctx, sale.inventoryId, sale.size, sale.quantity,
            userId, "cancel", sale._id
          );
        }
      }

      // Eliminar ventas viejas
      for (const sale of oldSales) {
        await ctx.db.delete(sale._id);
      }
    }

    // ================================================================
    // 7. Insertar items de venta
    // ================================================================
    const saleIds: Id<"sales">[] = [];
    const expiresAt = isPending
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    for (const item of args.items) {
      const inventoryId = item.inventoryId
        ? (item.inventoryId as Id<"inventory">)
        : undefined;

      const saleId = await ctx.db.insert("sales", {
        userId,
        date: args.date,
        clientNumber: semanticId,
        productName: item.isReturn
          ? `(DEVOLUCIÓN) ${item.product}`
          : item.product,
        quantity: item.quantity,
        size: item.size,
        price: item.finalPrice,
        listPrice: item.listPrice,
        costPrice: item.costPrice,
        paymentMethod: args.payments[0]?.method || "Efectivo",
        paymentDetails: args.payments,
        status: isPending ? "pending" : "completed",
        expiresAt,
        inventoryId,
        clientId: finalClientId,
      });

      saleIds.push(saleId);

      // Deducir stock si la venta está completada y tiene inventario
      if (!isPending && inventoryId && item.size) {
        await deductStock(ctx, inventoryId, item.size, item.quantity, userId, saleId);
      }
    }

    // Insertar ajuste por redondeo
    if (Math.abs(roundingDiff) > 0 && Math.abs(roundingDiff) < 1000) {
      await ctx.db.insert("sales", {
        userId,
        date: args.date,
        clientNumber: semanticId,
        productName: "💰 AJUSTE POR REDONDEO",
        quantity: 1,
        size: "U",
        price: roundingDiff,
        listPrice: 0,
        costPrice: 0,
        paymentMethod: args.payments[0]?.method || "Efectivo",
        paymentDetails: args.payments,
        status: isPending ? "pending" : "completed",
        expiresAt,
        clientId: finalClientId,
      });
    }

    // ================================================================
    // 8. Sync client stats
    // ================================================================
    if (finalClientId) {
      await syncClientStats(ctx, finalClientId);
    }

    return {
      clientNumber: semanticId,
      voucher: generatedVoucher,
    };
  },
});

/**
 * Elimina una transacción completa y restaura el stock.
 */
export const deleteTransaction = mutation({
  args: { clientNumber: v.string() },
  handler: async (ctx, { clientNumber }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_userId_clientNumber", (q) =>
        q.eq("userId", userId).eq("clientNumber", clientNumber)
      )
      .collect();

    if (sales.length === 0) return;

    // Restaurar stock de ventas completadas
    const clientId = sales[0].clientId;
    for (const sale of sales) {
      if (sale.status === "completed" && sale.inventoryId && sale.size) {
        await restoreStock(
          ctx, sale.inventoryId, sale.size, sale.quantity,
          userId, "cancel", sale._id
        );
      }
    }

    // Eliminar todas las ventas del grupo
    for (const sale of sales) {
      await ctx.db.delete(sale._id);
    }

    // Sync client stats
    if (clientId) {
      await syncClientStats(ctx, clientId);
    }
  },
});
