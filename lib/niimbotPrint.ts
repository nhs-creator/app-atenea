import { NiimbotBluetoothClient, NiimbotSerialClient, NiimbotAbstractClient, ImageEncoder } from '@mmote/niimbluelib';

// Un solo cliente por sesión de pestaña — ni Web Bluetooth ni Web Serial
// permiten reconectar sin gesto del usuario entre recargas, así que no vale
// la pena persistirlo. Puede ser por Bluetooth (uso real, celular) o por
// USB/Serial (solo para probar en una compu con la impresora enchufada).
let client: NiimbotAbstractClient | null = null;

// UUID del servicio GATT que usan las impresoras NIIMBOT (confirmado en el
// código fuente de niimbluelib, client/bluetooth_impl.js — no está exportado
// públicamente desde el paquete, así que lo hardcodeamos acá).
const NIIMBOT_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';

/**
 * La librería arma su propio filtro de "requestDevice" (nombre que empieza
 * con la letra de un modelo conocido, o el UUID de servicio esperado). Si la
 * D110 real anuncia otro nombre, ni aparece en el selector — nos pasó en la
 * práctica ("no aparece en la lista de dispositivos"). Mientras dura la
 * conexión, forzamos "aceptar todos los dispositivos" para que se vea
 * cualquier Bluetooth cercano y ella elija a mano cuál es la impresora,
 * sin depender de adivinar el nombre exacto que usa el fabricante.
 * (Sin tipos de Web Bluetooth en el proyecto — API experimental, no está en
 * el lib.dom.d.ts estándar de TypeScript — de ahí los `any` puntuales.)
 */
async function connectWithPermissiveFilter(c: NiimbotBluetoothClient): Promise<void> {
  const bt = (navigator as any).bluetooth;
  const original = bt.requestDevice.bind(bt);
  bt.requestDevice = () =>
    original({ acceptAllDevices: true, optionalServices: [NIIMBOT_SERVICE_UUID] });
  try {
    await c.connect();
  } finally {
    bt.requestDevice = original;
  }
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/user gesture|user activation/i.test(msg)) {
    return 'Tocá el botón de nuevo para elegir la impresora.';
  }
  if (/cancelled|cancel/i.test(msg)) {
    return 'Cancelaste la selección de impresora.';
  }
  if (/no devices|not found/i.test(msg)) {
    return 'No encontré la impresora. Fijate que esté prendida y cerca del celular.';
  }
  return 'Se cortó la conexión con la impresora. Probá de nuevo.';
}

export function isPrinterConnected(): boolean {
  return !!client?.isConnected();
}

/**
 * Safari/WebKit (todo navegador en iOS, Chrome incluido — Apple obliga a
 * usar su motor) nunca implementó la Web Bluetooth API. No es un bug de
 * conexión ni un tema de filtros: `navigator.bluetooth` directamente no
 * existe ahí, así que imprimir por Bluetooth desde la web es imposible en
 * iPhone/iPad sin envolver la app como app nativa. Chequeamos esto antes de
 * intentar conectar para poder ofrecer el flujo de "Compartir" como
 * alternativa en vez de tirar un error de Bluetooth genérico y confuso.
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
}

/**
 * Web Serial (USB) sí anda en Chrome/Edge de escritorio (Windows/Mac/Linux) —
 * sirve para probar la impresión acá en la compu, con la D110 enchufada por
 * cable, sin depender de un Android ni de desplegar a producción cada vez.
 * NO sirve para el uso real en el local (nadie conecta el celular por cable a
 * la impresora) — es solo una vía de testing para desarrollo.
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).serial;
}

/** Abre el selector nativo de Bluetooth del navegador y conecta con la impresora elegida. */
export async function connectPrinter(): Promise<void> {
  try {
    const c = new NiimbotBluetoothClient();
    await connectWithPermissiveFilter(c);
    client = c;
  } catch (err) {
    client = null;
    throw new Error(friendlyError(err));
  }
}

/**
 * Abre el selector nativo de puertos serie del navegador (Web Serial) y
 * conecta con la impresora elegida. Requiere que la D110 esté enchufada por
 * USB — no todos los modelos NIIMBOT exponen datos por USB (algunos el
 * cable es solo para cargar la batería), así que si el puerto no aparece en
 * la lista o falla al conectar, es una limitación del hardware, no del código.
 */
export async function connectPrinterUSB(): Promise<void> {
  try {
    const c = new NiimbotSerialClient();
    await c.connect();
    client = c;
  } catch (err) {
    client = null;
    throw new Error(friendlyError(err));
  }
}

async function runPrintTask(c: NiimbotAbstractClient, canvas: HTMLCanvasElement, quantity: number): Promise<void> {
  // El cabezal térmico es físicamente angosto y fijo (~12mm, el ancho del
  // rollo) — esa es la dimensión de "columnas" real, y el papel se alimenta
  // en la otra dirección (hasta 40mm, "filas"). Nuestro canvas está dibujado
  // apaisado (320x96, así se ve normal en pantalla), así que hay que rotarlo
  // 90° al codificarlo para que el ancho de pantalla (320) se mande como
  // filas/avance de papel y el alto (96) como columnas/cabezal — 'left' hace
  // exactamente eso (es el default de la librería, no 'top': con 'top' el
  // cabezal solo alcanzaba a imprimir las primeras ~96 columnas —el QR— y
  // cortaba el resto del ancho, además de alimentar de más solo 96 filas de
  // papel en vez de 320 — por eso salía recortado y pegado a los bordes).
  const encoded = ImageEncoder.encodeCanvas(canvas, 'left');
  // Ojo: "D110" a secas y "D110M" (el modelo real acá — nombre de dispositivo
  // "D110_M-...") hablan protocolos de imagen DISTINTOS. Con "D110" fijo la
  // impresora aceptaba la conexión y alimentaba papel (luz verde) pero
  // descartaba los datos de imagen por venir en el formato equivocado —
  // por eso salía en blanco. getPrintTaskType() detecta el protocolo real
  // a partir del modelo/versión que ya se leyó al conectar.
  const taskType = c.getPrintTaskType() ?? 'D110';
  const printTask = c.abstraction.newPrintTask(taskType, { totalPages: quantity });
  try {
    await printTask.printInit();
    await printTask.printPage(encoded, quantity);
    await printTask.waitForPageFinished();
    await printTask.waitForFinished();
  } finally {
    await c.abstraction.printEnd();
  }
}

/**
 * Imprime un canvas ya armado a las dimensiones reales de la etiqueta (ver
 * `printInventoryLabelCanvas` en generateInventoryLabel.ts). Conecta con la
 * impresora primero si todavía no hay una conectada en esta sesión.
 */
export async function printLabel(canvas: HTMLCanvasElement, quantity = 1): Promise<void> {
  if (!isPrinterConnected()) {
    await connectPrinter();
  }
  if (!client) throw new Error('No hay impresora conectada.');
  try {
    await runPrintTask(client, canvas, quantity);
  } catch (err) {
    throw new Error(friendlyError(err));
  }
}

/** Igual que printLabel pero conectando por USB/Serial en vez de Bluetooth — solo para testing local. */
export async function printLabelUSB(canvas: HTMLCanvasElement, quantity = 1): Promise<void> {
  if (!isPrinterConnected()) {
    await connectPrinterUSB();
  }
  if (!client) throw new Error('No hay impresora conectada.');
  try {
    await runPrintTask(client, canvas, quantity);
  } catch (err) {
    throw new Error(friendlyError(err));
  }
}
