import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Calcula el stock total sumando todos los valores del objeto sizes.
 */
export function computeStockTotal(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
}

/**
 * Deduce stock de un item de inventario y registra el movimiento.
 * Lanza error si no hay stock suficiente.
 */
export async function deductStock(
  ctx: MutationCtx,
  inventoryId: Id<"inventory">,
  size: string,
  quantity: number,
  userId: string,
  referenceId?: string,
) {
  const item = await ctx.db.get(inventoryId);
  if (!item) throw new Error("Producto no encontrado en inventario");

  const currentQty = item.sizes[size] ?? 0;
  const newQty = currentQty - quantity;

  if (newQty < 0) {
    throw new Error(
      `Insufficient stock for ${item.name} size ${size}. Available: ${currentQty}, requested: ${quantity}`
    );
  }

  const newSizes = { ...item.sizes, [size]: newQty };
  await ctx.db.patch(inventoryId, {
    sizes: newSizes,
    stockTotal: computeStockTotal(newSizes),
  });

  await ctx.db.insert("inventoryMovements", {
    inventoryId,
    userId,
    movementType: "sale",
    size,
    quantityChange: -quantity,
    quantityBefore: currentQty,
    quantityAfter: newQty,
    referenceType: "sale",
    referenceId,
  });
}

/**
 * Restaura stock de un item de inventario y registra el movimiento.
 */
export async function restoreStock(
  ctx: MutationCtx,
  inventoryId: Id<"inventory">,
  size: string,
  quantity: number,
  userId: string,
  reason: "return" | "cancel",
  referenceId?: string,
) {
  const item = await ctx.db.get(inventoryId);
  if (!item) return; // item could have been deleted

  const currentQty = item.sizes[size] ?? 0;
  const newQty = currentQty + quantity;
  const newSizes = { ...item.sizes, [size]: newQty };

  await ctx.db.patch(inventoryId, {
    sizes: newSizes,
    stockTotal: computeStockTotal(newSizes),
  });

  await ctx.db.insert("inventoryMovements", {
    inventoryId,
    userId,
    movementType: reason,
    size,
    quantityChange: quantity,
    quantityBefore: currentQty,
    quantityAfter: newQty,
    referenceType: "sale",
    referenceId,
  });
}

/**
 * Sincroniza las estadísticas denormalizadas del cliente
 * (totalSpent, lastPurchaseDate) basándose en sus ventas completadas.
 */
export async function syncClientStats(
  ctx: MutationCtx,
  clientId: Id<"clients">,
) {
  const client = await ctx.db.get(clientId);
  if (!client) return;

  const sales = await ctx.db
    .query("sales")
    .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
    .collect();

  const completedSales = sales.filter((s) => s.status === "completed");

  const totalSpent = completedSales.reduce(
    (sum, s) => sum + s.price * s.quantity,
    0,
  );

  let lastPurchaseDate: string | undefined;
  if (completedSales.length > 0) {
    lastPurchaseDate = completedSales.reduce(
      (latest, s) => (s.date > latest ? s.date : latest),
      completedSales[0].date,
    );
  }

  await ctx.db.patch(clientId, { totalSpent, lastPurchaseDate });
}
