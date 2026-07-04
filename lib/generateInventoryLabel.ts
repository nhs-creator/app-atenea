import QRCode from 'qrcode';
import { LabelSizeId, getLabelSizeMm } from './labelSizes';

export interface InventoryLabelData {
  code: string;
  productName: string;
  price: number;
  /** Talle a mostrar en la etiqueta (ej. "38", "M") — se omite si no se pasa o es "UNICO". */
  size?: string;
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

// Etiquetas reales del rollo de la impresora NIIMBOT D110: nominal "12x40mm",
// pero 12mm es el ancho del cabezal/rollo (variable según el rollo cargado,
// ver lib/labelSizes.ts) — leída de forma normal, la etiqueta queda apaisada:
// el largo como ancho x el ancho del cabezal como alto (la primera versión de
// este canvas la había armado al revés, angosta y alta — corregido al
// comparar con una etiqueta armada a mano en la app oficial de Niimbot).
// 203dpi es la resolución del cabezal térmico, ~8px/mm. El tamaño se define
// en píxeles porque eso es lo que la impresora recibe — no hay metadata de
// DPI de por medio como en un PDF.
const PRINT_PX_PER_MM = 203 / 25.4;
// El margen vertical (eje del cabezal) venía muy justo con el rollo de 12mm —
// el QR llegaba a tocar el borde físico y se cortaba un poco al imprimir en
// real. Con 8px (~1mm) de aire de cada lado entra sin recortarse.
const PRINT_MARGIN = 8;

function truncateToFit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

/**
 * Envuelve `text` en como mucho `maxLines` líneas que entren en `maxWidth`
 * (con la fuente ya seteada en `ctx`). `fits: false` significa que sobraron
 * palabras sin ubicar — el llamador decide si achica la fuente o trunca.
 */
function wrapToLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): { lines: string[]; fits: boolean } {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length >= maxLines) return { lines: lines.slice(0, maxLines), fits: false };
  }
  if (current) lines.push(current);
  return lines.length <= maxLines ? { lines, fits: true } : { lines: lines.slice(0, maxLines), fits: false };
}

/**
 * Arma el canvas para imprimir directo por Bluetooth (lib/niimbotPrint.ts) o
 * para compartir a la app de Niimbot en iPhone (donde Bluetooth no anda).
 * Layout apaisado: QR a la izquierda (ocupa todo el alto) + precio y nombre
 * a la derecha, achicados hasta entrar en el ancho disponible.
 *
 * `labelSize` define el rollo cargado en la impresora (ver lib/labelSizes.ts)
 * — por defecto el original de 12x40mm si no se pasa nada.
 */
export async function printInventoryLabelCanvas(data: InventoryLabelData, labelSize?: LabelSizeId): Promise<HTMLCanvasElement> {
  const { headMm, lengthMm } = getLabelSizeMm(labelSize);
  const printWidth = Math.round(lengthMm * PRINT_PX_PER_MM);
  const printHeight = Math.round(headMm * PRINT_PX_PER_MM);

  const canvas = document.createElement('canvas');
  canvas.width = printWidth;
  canvas.height = printHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas de la etiqueta');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, printWidth, printHeight);

  const qrSize = printHeight - PRINT_MARGIN * 2;
  const qrDataUrl = await QRCode.toDataURL(data.code, { width: qrSize, margin: 0 });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, PRINT_MARGIN, PRINT_MARGIN, qrSize, qrSize);

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const textX = PRINT_MARGIN + qrSize + 8;
  const textMaxWidth = printWidth - textX - PRINT_MARGIN;
  let blockY = PRINT_MARGIN + 8;

  // El talle va en la esquina superior derecha, en la misma línea que el
  // precio — un badge chico, no una línea propia. "UNICO" no aporta nada
  // (categorías sin talles reales, ej. accesorios) así que se omite.
  const hasSize = !!data.size && data.size.trim().toUpperCase() !== 'UNICO';
  let sizeTextWidth = 0;
  if (hasSize) {
    const sizeText = `TALLE ${data.size!.toUpperCase()}`;
    let sizeFontSize = 16;
    do {
      ctx.font = `bold ${sizeFontSize}px sans-serif`;
      sizeFontSize -= 1;
    } while (ctx.measureText(sizeText).width > textMaxWidth * 0.45 && sizeFontSize > 9);
    sizeTextWidth = ctx.measureText(sizeText).width;
    ctx.textAlign = 'right';
    ctx.fillText(sizeText, printWidth - PRINT_MARGIN, blockY);
    ctx.textAlign = 'left';
  }

  // El precio comparte la línea con el talle, así que su ancho disponible
  // se reduce por lo que ya ocupa el badge del talle a la derecha.
  const priceMaxWidth = textMaxWidth - (hasSize ? sizeTextWidth + 8 : 0);
  const priceText = `$${Math.round(data.price).toLocaleString('es-AR')}`;
  let priceSize = 32;
  do {
    ctx.font = `bold ${priceSize}px sans-serif`;
    priceSize -= 1;
  } while (ctx.measureText(priceText).width > priceMaxWidth && priceSize > 16);
  ctx.fillText(priceText, textX, blockY);

  // Nombre: hasta 2 líneas, achicando la fuente si con el tamaño más grande
  // no entra completo; si ni al tamaño mínimo entra, recién ahí se trunca
  // con "…" en la última línea.
  const nameY = blockY + priceSize + 10;
  const upperName = data.productName.toUpperCase();
  let nameSize = 15;
  let wrapped = { lines: [upperName], fits: false };
  do {
    ctx.font = `${nameSize}px sans-serif`;
    wrapped = wrapToLines(ctx, upperName, textMaxWidth, 2);
    if (wrapped.fits) break;
    nameSize -= 1;
  } while (nameSize > 9);

  if (!wrapped.fits) {
    // wrapToLines corta por palabra entera — la última línea puede entrar
    // justa en el ancho sin necesitar recorte de caracteres, pero igual
    // quedaron palabras afuera. Forzamos el "…" para que se note.
    const lastIdx = wrapped.lines.length - 1;
    wrapped.lines[lastIdx] = truncateToFit(ctx, `${wrapped.lines[lastIdx]}…`, textMaxWidth);
  }
  wrapped.lines.forEach((line, i) => {
    ctx.fillText(line, textX, nameY + i * (nameSize + 3));
  });

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
