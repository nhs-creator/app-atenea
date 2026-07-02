import QRCode from 'qrcode';

export interface InventoryLabelData {
  code: string;
  productName: string;
  price: number;
}

const LABEL_WIDTH = 400;
const LABEL_HEIGHT = 240;
const QR_SIZE = 190;
const MARGIN = 16;

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

  const textX = MARGIN + QR_SIZE + 18;
  const textMaxWidth = LABEL_WIDTH - textX - MARGIN;
  ctx.fillStyle = '#0f172a';
  ctx.textBaseline = 'top';

  ctx.font = 'bold 26px sans-serif';
  const nameLines = wrapText(ctx, data.productName.toUpperCase(), textMaxWidth, 3);
  let y = 28;
  for (const line of nameLines) {
    ctx.fillText(line, textX, y);
    y += 30;
  }

  y += 8;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#4f46e5';
  ctx.fillText(`$${Math.round(data.price).toLocaleString('es-AR')}`, textX, y);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(data.code, textX, LABEL_HEIGHT - MARGIN - 22);

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
