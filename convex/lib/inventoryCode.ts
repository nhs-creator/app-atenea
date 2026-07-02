/**
 * Genera el código interno (para QR/etiqueta) de un item de inventario a
 * partir de su Convex _id — ya es único, así que no hace falta un contador
 * separado. Lógica pura, testeable sin tocar la base.
 */
export function generateInventoryCode(inventoryId: string): string {
  const tail = inventoryId.slice(-8).toUpperCase();
  return `ATN-${tail}`;
}
