"use node";

import Afip from "@afipsdk/afip.js";

/** Check if AFIP credentials are configured. */
export function isAfipConfigured(): boolean {
  return !!(
    process.env.AFIP_CERT &&
    process.env.AFIP_KEY &&
    process.env.AFIP_SDK_TOKEN
  );
}

/** Decode base64-encoded PEM from env var (o lo devuelve tal cual si ya es PEM crudo). */
function decodePem(envValue: string): string {
  if (envValue.startsWith("-----")) return envValue;
  return Buffer.from(envValue, "base64").toString("utf-8");
}

/** Crea una instancia del SDK de AFIP a partir de las variables de entorno + config. */
export function createAfipInstance(config: {
  cuit: number;
  isProduction: boolean;
}): InstanceType<typeof Afip> {
  const certRaw = process.env.AFIP_CERT;
  const keyRaw = process.env.AFIP_KEY;
  const accessToken = process.env.AFIP_SDK_TOKEN;
  if (!certRaw || !keyRaw) throw new Error("AFIP_CERT y AFIP_KEY no configurados");
  if (!accessToken) throw new Error("AFIP_SDK_TOKEN no configurado (obtenerlo en app.afipsdk.com)");

  return new Afip({
    CUIT: config.cuit,
    cert: decodePem(certRaw),
    key: decodePem(keyRaw),
    production: config.isProduction,
    access_token: accessToken,
  });
}

/** Formatea el número fiscal para mostrar: "C 00002-00000147". */
export function formatFiscalNumber(
  cbteTipo: number,
  puntoVenta: number,
  cbteNro: number
): string {
  const typeLetters: Record<number, string> = {
    1: "A",
    6: "B",
    11: "C",
    13: "NC-C",
  };
  const letter = typeLetters[cbteTipo] ?? String(cbteTipo);
  const pv = String(puntoVenta).padStart(5, "0");
  const nro = String(cbteNro).padStart(8, "0");
  return `${letter} ${pv}-${nro}`;
}

/** Arma la URL del QR según la especificación AFIP RG 4291/2018. */
export function buildAfipQrPayload(params: {
  ver: number;
  fecha: string;
  cuit: number;
  ptoVta: number;
  cbteTipo: number;
  cbteNro: number;
  importe: number;
  moneda: string;
  ctz: number;
  tipoDocRec: number;
  nroDocRec: number;
  tipoCodAut: string;
  codAut: number;
}): string {
  const jsonStr = JSON.stringify(params);
  const base64 = Buffer.from(jsonStr).toString("base64");
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
}

/**
 * Fecha actual en zona horaria Argentina (UTC-3) como "YYYY-MM-DD".
 * Evita el bug de toISOString() que usa UTC y salta un día después de las 21:00 AR.
 */
export function todayArgentina(): string {
  const d = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // "en-CA" produce nativamente "YYYY-MM-DD"
}
