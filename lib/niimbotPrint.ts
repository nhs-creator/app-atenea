import { NiimbotBluetoothClient, ImageEncoder } from '@mmote/niimbluelib';

// Un solo cliente por sesión de pestaña — Web Bluetooth no permite reconectar
// sin gesto del usuario entre recargas, así que no vale la pena persistirlo.
let client: NiimbotBluetoothClient | null = null;

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

/** Abre el selector nativo de Bluetooth del navegador y conecta con la impresora elegida. */
export async function connectPrinter(): Promise<void> {
  try {
    const c = new NiimbotBluetoothClient();
    await c.connect();
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
