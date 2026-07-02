import QRCode from 'qrcode';

export interface InventoryLabelData {
  code: string;
  productName: string;
  price: number;
}

// Etiqueta de cartón real: 9cm x 2.5cm. 10px/mm da buena resolución para el QR
// (nítido incluso impreso chico) sin generar una imagen enorme.
const MM_TO_PX = 10;
const LABEL_WIDTH = 90 * MM_TO_PX;
const LABEL_HEIGHT = 25 * MM_TO_PX;
const MARGIN = 15;
const QR_SIZE = LABEL_HEIGHT - MARGIN * 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

/** Genera la etiqueta (QR + nombre + precio + código legible) como PNG blob, lista para imprimir. */
export async function generateInventoryLabel(data: InventoryLabelData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas de la etiqueta');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  const qrDataUrl = await QRCode.toDataURL(data.code, { width: QR_SIZE, margin: 0 });
  const qrImg = await loadImage(qrDataUrl);
  const qrY = (LABEL_HEIGHT - QR_SIZE) / 2;
  ctx.drawImage(qrImg, MARGIN, qrY, QR_SIZE, QR_SIZE);

  const textX = MARGIN + QR_SIZE + 22;
  const textMaxWidth = LABEL_WIDTH - textX - MARGIN;
  ctx.fillStyle = '#0f172a';
  ctx.textBaseline = 'top';

  // Todo en negro puro: las impresoras térmicas (NIIMBOT) son monocromáticas —
  // cualquier color no-negro se convierte a gris con dithering y sale borroso
  // (confirmado con una impresión real). Nada de tonos "casi negro" tampoco.
  ctx.fillStyle = '#000000';

  ctx.font = 'bold 32px sans-serif';
  const nameLines = wrapText(ctx, data.productName.toUpperCase(), textMaxWidth, 2);
  let y = MARGIN + 6;
  for (const line of nameLines) {
    ctx.fillText(line, textX, y);
    y += 36;
  }

  y += 10;
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(`$${Math.round(data.price).toLocaleString('es-AR')}`, textX, y);

  ctx.font = '22px monospace';
  ctx.fillText(data.code, textX, LABEL_HEIGHT - MARGIN - 26);

  return canvasToBlob(canvas);
}

/** Convierte cualquier canvas de etiqueta a PNG, para compartir/descargar. */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo generar la imagen de la etiqueta'));
    }, 'image/png');
  });
}

export function inventoryLabelFilename(code: string): string {
  return `Etiqueta-${code}.png`;
}

// Etiquetas reales del rollo de la impresora NIIMBOT D110: 12mm x 40mm —
// mucho más angosto que el cartón, no entra el layout horizontal de arriba.
// 203dpi es la resolución del cabezal térmico (misma que confirmamos para
// la B1), ~8px/mm. El tamaño se define en píxeles porque eso es lo que la
// impresora recibe — no hay metadata de DPI de por medio como en un PDF.
const PRINT_PX_PER_MM = 203 / 25.4;
const PRINT_WIDTH = Math.round(12 * PRINT_PX_PER_MM);
const PRINT_HEIGHT = Math.round(40 * PRINT_PX_PER_MM);
const PRINT_MARGIN = 4;

/**
 * Arma el canvas para imprimir directo por Bluetooth (lib/niimbotPrint.ts).
 * Layout vertical: QR arriba (ocupa casi todo el ancho de 12mm) + código en
 * texto chico abajo. Nombre/precio no entran legibles en 12mm — quedan
 * afuera de esta etiqueta chica (la info completa vive en el QR/la app).
 */
export async function printInventoryLabelCanvas(data: InventoryLabelData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_WIDTH;
  canvas.height = PRINT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas de la etiqueta');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PRINT_WIDTH, PRINT_HEIGHT);

  const qrSize = PRINT_WIDTH - PRINT_MARGIN * 2;
  const qrDataUrl = await QRCode.toDataURL(data.code, { width: qrSize, margin: 0 });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, PRINT_MARGIN, PRINT_MARGIN, qrSize, qrSize);

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  // El código completo (ej. "ATN-7F3A9C21", 12 caracteres) no entra a un
  // tamaño fijo en 12mm de ancho — achicamos la fuente hasta que entre.
  const textMaxWidth = PRINT_WIDTH - PRINT_MARGIN * 2;
  let fontSize = Math.round(PRINT_WIDTH * 0.16);
  do {
    ctx.font = `${fontSize}px monospace`;
    fontSize -= 1;
  } while (ctx.measureText(data.code).width > textMaxWidth && fontSize > 6);
  ctx.fillText(data.code, PRINT_WIDTH / 2, PRINT_MARGIN * 2 + qrSize);

  return canvas;
}

/**
 * Comparte la etiqueta con el share nativo del dispositivo (para mandarla a
 * la app de la impresora térmica); si no está disponible, la descarga.
 */
export async function shareOrDownloadInventoryLabel(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' });

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  try {
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    console.error(e);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
