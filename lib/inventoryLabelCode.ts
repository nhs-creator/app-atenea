// El código de producto tiene largo fijo ("ATN-" + 8 caracteres = 12), ver
// convex/lib/inventoryCode.ts. Eso permite separar el talle del código sin
// ambigüedad por posición, en vez de depender de que el talle nunca tenga
// un guion (los talles son texto libre, ver SettingsView.tsx).
const ITEM_CODE_LENGTH = 12;
const SEPARATOR = '-';

/**
 * Arma el código a imprimir en el QR: código de producto + talle, para que
 * escanear la etiqueta en Ingresos autoseleccione el talle. Si no hay talle
 * o es "UNICO" (categorías sin talles reales), se imprime el código del
 * producto solo — mismo formato que las etiquetas viejas.
 */
export function composeInventoryLabelCode(itemCode: string, size?: string): string {
  const trimmed = size?.trim();
  if (!trimmed || trimmed.toUpperCase() === 'UNICO') return itemCode;
  return `${itemCode}${SEPARATOR}${trimmed}`;
}

/**
 * Separa un código escaneado en código de producto + talle (si lo tiene).
 * Códigos viejos (sin talle) o cualquier otro QR ajeno devuelven `size`
 * undefined — el llamador cae al comportamiento de elegir talle a mano.
 */
export function parseInventoryLabelCode(scanned: string): { itemCode: string; size?: string } {
  if (scanned.length > ITEM_CODE_LENGTH && scanned[ITEM_CODE_LENGTH] === SEPARATOR) {
    const size = scanned.slice(ITEM_CODE_LENGTH + 1);
    return { itemCode: scanned.slice(0, ITEM_CODE_LENGTH), size: size || undefined };
  }
  return { itemCode: scanned };
}
