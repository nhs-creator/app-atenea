// Tamaños de rollo soportados por la impresora térmica NIIMBOT D110 — el
// cabezal es de ancho fijo por rollo (no hay zoom de software posible), así
// que un rollo más ancho es la única forma de agrandar el QR impreso. La D110
// admite hasta 15mm de ancho de cabezal (confirmado en specs del fabricante:
// rollos 12x40mm, 14x30mm y 15x30mm son todos compatibles).
export type LabelSizeId = '12x40' | '14x30' | '15x30';

export interface LabelSizeMm {
  /** Ancho del cabezal/rollo en mm — es el alto visual del canvas apaisado. */
  headMm: number;
  /** Largo de la etiqueta en mm — es el ancho visual del canvas apaisado. */
  lengthMm: number;
}

export const LABEL_SIZE_PRESETS: Record<LabelSizeId, LabelSizeMm> = {
  '12x40': { headMm: 12, lengthMm: 40 },
  '14x30': { headMm: 14, lengthMm: 30 },
  '15x30': { headMm: 15, lengthMm: 30 },
};

export const LABEL_SIZE_LABELS: Record<LabelSizeId, string> = {
  '12x40': '12 x 40 mm (rollo original)',
  '14x30': '14 x 30 mm',
  '15x30': '15 x 30 mm (QR más grande)',
};

export const DEFAULT_LABEL_SIZE_ID: LabelSizeId = '12x40';

export function getLabelSizeMm(id?: string): LabelSizeMm {
  return LABEL_SIZE_PRESETS[id as LabelSizeId] || LABEL_SIZE_PRESETS[DEFAULT_LABEL_SIZE_ID];
}
