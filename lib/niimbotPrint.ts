import { NiimbotBluetoothClient, ImageEncoder } from '@mmote/niimbluelib';

// Un solo cliente por sesión de pestaña — Web Bluetooth no permite reconectar
// sin gesto del usuario entre recargas, así que no vale la pena persistirlo.
let client: NiimbotBluetoothClient | null = null;

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
    const encoded = ImageEncoder.encodeCanvas(canvas, 'top');
    const printTask = client.abstraction.newPrintTask('D110', { totalPages: quantity });
    try {
      await printTask.printInit();
      await printTask.printPage(encoded, quantity);
      await printTask.waitForPageFinished();
      await printTask.waitForFinished();
    } finally {
      await client.abstraction.printEnd();
    }
  } catch (err) {
    throw new Error(friendlyError(err));
  }
}
