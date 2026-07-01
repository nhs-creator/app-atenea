/**
 * Validadores compartidos para la configuración AFIP.
 * Sin `"use node"` — se invocan desde mutations, no solo desde actions
 * (los helpers que tocan el SDK de afip.js viven en `afipSdk.ts`).
 */

/** CUIT válido: 11 dígitos numéricos. No valida el dígito verificador (afip.js lo hace). */
export function validateCuit(cuit: number): void {
  if (!Number.isInteger(cuit) || cuit <= 0) {
    throw new Error("CUIT debe ser un entero positivo");
  }
  const str = String(cuit);
  if (str.length !== 11) {
    throw new Error(`CUIT debe tener 11 dígitos (recibido: ${str.length})`);
  }
}

/** Punto de venta AFIP: entre 1 y 99999 (5 dígitos máx según RG 4290). */
export function validatePuntoVenta(pv: number): void {
  if (!Number.isInteger(pv) || pv < 1 || pv > 99999) {
    throw new Error("Punto de venta debe ser un entero entre 1 y 99999");
  }
}

/** Razón social: no vacía, sin caracteres de control. */
export function validateRazonSocial(razon: string): void {
  const trimmed = razon.trim();
  if (trimmed.length === 0) {
    throw new Error("Razón social no puede estar vacía");
  }
  if (trimmed.length > 200) {
    throw new Error("Razón social no puede exceder 200 caracteres");
  }
  // ASCII 0–31 (controles) y 127 (DEL).
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    throw new Error("Razón social no puede contener caracteres de control");
  }
}

/** Fecha en formato ISO YYYY-MM-DD. */
export function validateIsoDate(date: string, label = "fecha"): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${label} debe estar en formato YYYY-MM-DD`);
  }
  const parsed = new Date(date + "T00:00:00Z");
  if (isNaN(parsed.getTime())) {
    throw new Error(`${label} no es una fecha válida`);
  }
}

/** Condición IVA: códigos AFIP relevantes para un monotributista (receptor o propio). */
const VALID_CONDICION_IVA = new Set([1, 4, 5, 6, 13]);
export function validateCondicionIva(cond: number): void {
  if (!VALID_CONDICION_IVA.has(cond)) {
    throw new Error(
      `Condición IVA inválida (recibido: ${cond}). Valores válidos: ${[...VALID_CONDICION_IVA].join(", ")}`
    );
  }
}
