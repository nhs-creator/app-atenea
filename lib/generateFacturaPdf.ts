import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface FacturaPdfItem {
  product_name: string;
  quantity: number;
  price: number;
  size?: string;
}

export interface FacturaPdfData {
  fiscalNumber: string;
  cae: string;
  caeExpiration: string;
  qrData: string;
  importeTotal: number;
  fecha: string;
  totalVenta: number;
  items: FacturaPdfItem[];
  docTipo: number;
  docNro: number;
  condicionIvaReceptor: number;
  clientName?: string;
  afipConfig: {
    razonSocial: string;
    /** Nombre del negocio (ej. "Atenea Moda y Accesorios"). ARCA exige que la
     * razón social (nombre legal) igual figure — por eso siempre se muestra
     * debajo, nunca en su reemplazo. */
    nombreFantasia?: string;
    cuit: number;
    domicilioComercial: string;
    condicionIva: number;
  };
}

const DOC_TIPO_LABELS: Record<number, string> = { 80: 'CUIT', 86: 'CUIL', 96: 'DNI', 99: 'Consumidor Final' };
const CONDICION_IVA_LABELS: Record<number, string> = {
  1: 'IVA Responsable Inscripto',
  4: 'IVA Sujeto Exento',
  5: 'Consumidor Final',
  6: 'Responsable Monotributo',
};

function formatCuit(cuit: number): string {
  const s = String(cuit).padStart(11, '0');
  return `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`;
}

function formatARS(n: number): string {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

/** Genera el PDF (no fiscal en sí — un ticket propio con el detalle de productos + el CAE/QR real de AFIP). */
export async function generateFacturaPdf(data: FacturaPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 15;
  const rightX = 195;
  let y = 18;

  // --- Encabezado: datos del emisor ---
  // Si hay nombre de fantasía, es el título principal y la razón social
  // (nombre legal, obligatorio para ARCA) va debajo en chico — nunca la
  // reemplaza, solo la acompaña.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(data.afipConfig.nombreFantasia || data.afipConfig.razonSocial, marginX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FACTURA C', rightX, y, { align: 'right' });

  if (data.afipConfig.nombreFantasia) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(data.afipConfig.razonSocial, marginX, y);
    doc.setTextColor(0, 0, 0);
  }

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`CUIT: ${formatCuit(data.afipConfig.cuit)}`, marginX, y);
  doc.setFontSize(11);
  doc.text(data.fiscalNumber, rightX, y, { align: 'right' });

  y += 5;
  doc.setFontSize(9);
  doc.text(data.afipConfig.domicilioComercial, marginX, y);
  doc.text(`Fecha: ${data.fecha}`, rightX, y, { align: 'right' });

  y += 5;
  doc.text(CONDICION_IVA_LABELS[data.afipConfig.condicionIva] || '', marginX, y);

  y += 8;
  doc.setDrawColor(200);
  doc.line(marginX, y, rightX, y);
  y += 7;

  // --- Cliente ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CLIENTE', marginX, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.clientName || 'Consumidor Final', marginX, y);
  y += 5;
  if (data.docTipo !== 99) {
    doc.text(`${DOC_TIPO_LABELS[data.docTipo] || data.docTipo}: ${data.docNro}`, marginX, y);
    y += 5;
  }
  doc.text(CONDICION_IVA_LABELS[data.condicionIvaReceptor] || '', marginX, y);
  y += 9;

  // --- Tabla de productos ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setFillColor(30, 41, 59);
  doc.rect(marginX, y, rightX - marginX, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('PRODUCTO', marginX + 2, y + 5);
  doc.text('CANT.', 138, y + 5);
  doc.text('PRECIO', 158, y + 5);
  doc.text('SUBTOTAL', rightX - 2, y + 5, { align: 'right' });
  y += 7;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  data.items.forEach((item, i) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    const rowH = 6.2;
    if (i % 2 === 1) {
      doc.setFillColor(245, 245, 245);
      doc.rect(marginX, y, rightX - marginX, rowH, 'F');
    }
    const label = item.size && item.size !== 'U' ? `${item.product_name} (${item.size})` : item.product_name;
    doc.text(label.length > 48 ? `${label.slice(0, 48)}…` : label, marginX + 2, y + 4.3);
    doc.text(String(item.quantity), 138, y + 4.3);
    doc.text(formatARS(item.price), 158, y + 4.3);
    doc.text(formatARS(item.price * item.quantity), rightX - 2, y + 4.3, { align: 'right' });
    y += rowH;
  });

  y += 8;

  if (Math.round(data.totalVenta) !== Math.round(data.importeTotal)) {
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Total de la venta: ${formatARS(data.totalVenta)} (incluye pagos en efectivo, que no se facturan).`,
      marginX,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  doc.setDrawColor(200);
  doc.line(120, y, rightX, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL FACTURADO', 120, y);
  doc.text(formatARS(data.importeTotal), rightX, y, { align: 'right' });
  y += 14;

  // --- CAE + QR ---
  const qrDataUrl = await QRCode.toDataURL(data.qrData, { width: 150, margin: 1 });
  doc.addImage(qrDataUrl, 'PNG', marginX, y, 28, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`CAE: ${data.cae}`, marginX + 34, y + 6);
  doc.text(`Vencimiento CAE: ${data.caeExpiration}`, marginX + 34, y + 12);
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text('Verificá este comprobante en afip.gob.ar/fe/qr', marginX + 34, y + 18);

  return doc;
}

export function facturaPdfFilename(fiscalNumber: string): string {
  return `Factura-${fiscalNumber.replace(/\s+/g, '_')}.pdf`;
}

/**
 * Comparte el PDF con el share nativo del dispositivo si está disponible
 * (para mandarlo directo por WhatsApp/etc en el celular); si no, lo descarga.
 * Si el usuario cancela el share nativo, no propaga error (no es una falla real).
 */
export async function shareOrDownloadFacturaPdf(doc: jsPDF, filename: string): Promise<void> {
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

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
  doc.save(filename);
}
