/**
 * 3-Level Relational Inventory Categorization System
 * Based on sales analysis (categorias-inventario-completo.md)
 *
 * Level 1: Main Categories (e.g., Tejidos y Abrigos)
 * Level 2: Subcategories/Product Types (clean names, e.g., "Remera" not "Remera Modal")
 * Level 3: Materials/Attributes (e.g., Algodón, Modal, Jean)
 */

// =============================================================================
// INTERFACES & TYPES
// =============================================================================

export interface ICategory {
  id: string;
  label: string;
}

export interface ISubcategory {
  id: string;
  categoryId: string;
  label: string;
}

export interface IMaterial {
  id: string;
  label: string;
  normalizedKey: string;
}

/** Optional: Fits/Styles for Prendas Inferiores (Recto, Wide Leg, Mom Fit, etc.) */
export interface IVariant {
  id: string;
  label: string;
  categoryId: string; // Only applies to certain categories
}

// =============================================================================
// LEVEL 1: MAIN CATEGORIES
// =============================================================================

export const CATEGORIES: ICategory[] = [
  { id: 'tejidos_y_abrigos', label: 'Tejidos y Abrigos' },
  { id: 'prendas_superiores', label: 'Prendas Superiores' },
  { id: 'prendas_inferiores', label: 'Prendas Inferiores' },
  { id: 'piezas_enteras', label: 'Piezas Enteras' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'marroquinería', label: 'Marroquinería' },
  { id: 'bijouterie', label: 'Bijouterie' },
  { id: 'hogar_home', label: 'Hogar/Home' },
  { id: 'otros', label: 'Otros' },
];

// =============================================================================
// LEVEL 2: SUBCATEGORIES (linked to category IDs)
// =============================================================================

export const SUBCATEGORIES: ISubcategory[] = [
  // Group 1: TEJIDOS Y ABRIGOS
  { id: 'sueter', categoryId: 'tejidos_y_abrigos', label: 'Sueter' },
  { id: 'poleron', categoryId: 'tejidos_y_abrigos', label: 'Poleron' },
  { id: 'chaleco', categoryId: 'tejidos_y_abrigos', label: 'Chaleco' },
  { id: 'saco', categoryId: 'tejidos_y_abrigos', label: 'Saco' },
  { id: 'buzo', categoryId: 'tejidos_y_abrigos', label: 'Buzo' },
  { id: 'campera', categoryId: 'tejidos_y_abrigos', label: 'Campera' },
  { id: 'ruana', categoryId: 'tejidos_y_abrigos', label: 'Ruana' },
  { id: 'poncho', categoryId: 'tejidos_y_abrigos', label: 'Poncho' },
  { id: 'cardigan', categoryId: 'tejidos_y_abrigos', label: 'Cardigan' },
  // Group 2: PRENDAS SUPERIORES
  { id: 'remera', categoryId: 'prendas_superiores', label: 'Remera' },
  { id: 'musculosa', categoryId: 'prendas_superiores', label: 'Musculosa' },
  { id: 'blusa', categoryId: 'prendas_superiores', label: 'Blusa' },
  { id: 'camisa', categoryId: 'prendas_superiores', label: 'Camisa' },
  { id: 'polera', categoryId: 'prendas_superiores', label: 'Polera' },
  { id: 'body', categoryId: 'prendas_superiores', label: 'Body' },
  { id: 'top', categoryId: 'prendas_superiores', label: 'Top' },
  // Group 3: PRENDAS INFERIORES
  { id: 'jean', categoryId: 'prendas_inferiores', label: 'Jean' },
  { id: 'pantalon', categoryId: 'prendas_inferiores', label: 'Pantalón' },
  { id: 'palazo', categoryId: 'prendas_inferiores', label: 'Palazo' },
  { id: 'babucha', categoryId: 'prendas_inferiores', label: 'Babucha' },
  { id: 'short', categoryId: 'prendas_inferiores', label: 'Short' },
  { id: 'jogger', categoryId: 'prendas_inferiores', label: 'Jogger' },
  { id: 'pollera', categoryId: 'prendas_inferiores', label: 'Pollera' },
  // Group 4: PIEZAS ENTERAS
  { id: 'vestido', categoryId: 'piezas_enteras', label: 'Vestido' },
  { id: 'mono', categoryId: 'piezas_enteras', label: 'Mono' },
  // Group 5: ACCESORIOS
  { id: 'pañuelo', categoryId: 'accesorios', label: 'Pañuelo' },
  { id: 'gorra', categoryId: 'accesorios', label: 'Gorra' },
  { id: 'gorro', categoryId: 'accesorios', label: 'Gorro' },
  { id: 'boina', categoryId: 'accesorios', label: 'Boina' },
  { id: 'vincha', categoryId: 'accesorios', label: 'Vincha' },
  { id: 'bufanda', categoryId: 'accesorios', label: 'Bufanda' },
  { id: 'chalina', categoryId: 'accesorios', label: 'Chalina' },
  { id: 'pashmina', categoryId: 'accesorios', label: 'Pashmina' },
  { id: 'guante', categoryId: 'accesorios', label: 'Guante' },
  { id: 'miton', categoryId: 'accesorios', label: 'Mitón' },
  { id: 'cinto', categoryId: 'accesorios', label: 'Cinto' },
  // Group 6: MARROQUINERÍA
  { id: 'bolso', categoryId: 'marroquinería', label: 'Bolso' },
  { id: 'mochila', categoryId: 'marroquinería', label: 'Mochila' },
  { id: 'cartera', categoryId: 'marroquinería', label: 'Cartera' },
  { id: 'bandolera', categoryId: 'marroquinería', label: 'Bandolera' },
  { id: 'riñonera', categoryId: 'marroquinería', label: 'Riñonera' },
  { id: 'billetera', categoryId: 'marroquinería', label: 'Billetera' },
  { id: 'portacosmeticos', categoryId: 'marroquinería', label: 'Portacosméticos' },
  // Group 7: BIJOUTERIE
  { id: 'aros', categoryId: 'bijouterie', label: 'Aros' },
  { id: 'collares', categoryId: 'bijouterie', label: 'Collares' },
  { id: 'pulseras', categoryId: 'bijouterie', label: 'Pulseras' },
  { id: 'chokers', categoryId: 'bijouterie', label: 'Chokers' },
  { id: 'broches', categoryId: 'bijouterie', label: 'Broches' },
  { id: 'llaveros', categoryId: 'bijouterie', label: 'Llaveros' },
  // Group 8: HOGAR/HOME
  { id: 'difusor', categoryId: 'hogar_home', label: 'Difusor' },
  { id: 'vela', categoryId: 'hogar_home', label: 'Vela' },
  { id: 'textil', categoryId: 'hogar_home', label: 'Textil' },
  // Group 9: OTROS
  { id: 'cambios', categoryId: 'otros', label: 'Cambios' },
  { id: 'señas_restos', categoryId: 'otros', label: 'Señas/Restos' },
  { id: 'varios', categoryId: 'otros', label: 'Varios' },
];

// =============================================================================
// LEVEL 3: MATERIALS (consolidated, deduplicated)
// =============================================================================

export const MATERIALS: IMaterial[] = [
  { id: 'algodon', label: 'Algodón', normalizedKey: 'algodon' },
  { id: 'bambula', label: 'Bambula', normalizedKey: 'bambula' },
  { id: 'batista', label: 'Batista', normalizedKey: 'batista' },
  { id: 'bengalina', label: 'Bengalina', normalizedKey: 'bengalina' },
  { id: 'bremer', label: 'Bremer', normalizedKey: 'bremer' },
  { id: 'broderi', label: 'Broderi', normalizedKey: 'broderi' },
  { id: 'chenille', label: 'Chenille', normalizedKey: 'chenille' },
  { id: 'crepe', label: 'Crepé', normalizedKey: 'crepe' },
  { id: 'ecocuero', label: 'Ecocuero', normalizedKey: 'ecocuero' },
  { id: 'engomado', label: 'Engomado', normalizedKey: 'engomado' },
  { id: 'gabardina', label: 'Gabardina', normalizedKey: 'gabardina' },
  { id: 'hilo', label: 'Hilo', normalizedKey: 'hilo' },
  { id: 'jean', label: 'Jean', normalizedKey: 'jean' },
  { id: 'lana', label: 'Lana', normalizedKey: 'lana' },
  { id: 'lanilla', label: 'Lanilla', normalizedKey: 'lanilla' },
  { id: 'lino', label: 'Lino', normalizedKey: 'lino' },
  { id: 'micropolar', label: 'Micropolar', normalizedKey: 'micropolar' },
  { id: 'modal', label: 'Modal', normalizedKey: 'modal' },
  { id: 'morley', label: 'Morley', normalizedKey: 'morley' },
  { id: 'poplin', label: 'Poplín', normalizedKey: 'poplin' },
  { id: 'saten', label: 'Satén', normalizedKey: 'saten' },
  { id: 'simil_lino', label: 'Símil Lino', normalizedKey: 'simil_lino' },
  { id: 'tela', label: 'Tela', normalizedKey: 'tela' },
  { id: 'tuill', label: 'Tuill', normalizedKey: 'tuill' },
  { id: 'yute', label: 'Yute', normalizedKey: 'yute' },
];

// =============================================================================
// VARIANTS / FITS (for Prendas Inferiores - styles)
// =============================================================================

export const VARIANTS: IVariant[] = [
  { id: 'recto', label: 'Recto', categoryId: 'prendas_inferiores' },
  { id: 'wide_leg', label: 'Wide Leg', categoryId: 'prendas_inferiores' },
  { id: 'mom_fit', label: 'Mom Fit', categoryId: 'prendas_inferiores' },
  { id: 'cargo', label: 'Cargo', categoryId: 'prendas_inferiores' },
  { id: 'carpintero', label: 'Carpintero', categoryId: 'prendas_inferiores' },
  { id: 'sastrero', label: 'Sastrero', categoryId: 'prendas_inferiores' },
];

// Attributes for Prendas Superiores (Manga Larga, Manga Corta, Oversize)
export const SUPERIOR_ATTRIBUTES: IVariant[] = [
  { id: 'manga_larga', label: 'Manga Larga', categoryId: 'prendas_superiores' },
  { id: 'manga_corta', label: 'Manga Corta', categoryId: 'prendas_superiores' },
  { id: 'oversize', label: 'Oversize', categoryId: 'prendas_superiores' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get category by ID */
export function getCategoryById(id: string): ICategory | undefined {
  return CATEGORIES.find(c => c.id === id);
}

/** Get category by label (case-insensitive) */
export function getCategoryByLabel(label: string): ICategory | undefined {
  const normalized = label.trim().toLowerCase();
  return CATEGORIES.find(c => c.label.toLowerCase() === normalized);
}

/** Get subcategories for a category (by category ID or label) */
export function getSubcategoriesForCategory(categoryIdOrLabel: string): ISubcategory[] {
  const byId = SUBCATEGORIES.filter(s => s.categoryId === categoryIdOrLabel);
  if (byId.length > 0) return byId;
  const cat = getCategoryByLabel(categoryIdOrLabel);
  return cat ? SUBCATEGORIES.filter(s => s.categoryId === cat.id) : [];
}

/** Get material by normalized key (for parsing/search) */
export function getMaterialByNormalizedKey(key: string): IMaterial | undefined {
  const normalized = key.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return MATERIALS.find(m =>
    m.normalizedKey === normalized ||
    m.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalized.replace('_', '')
  );
}

/** Get variants/fits for Prendas Inferiores */
export function getVariantsForInferiores(): IVariant[] {
  return VARIANTS;
}

/** Get attributes for Prendas Superiores */
export function getAttributesForSuperiores(): IVariant[] {
  return SUPERIOR_ATTRIBUTES;
}

// =============================================================================
// APP CONFIG COMPATIBILITY (for use with AppConfig interface)
// =============================================================================

/** Returns categories as string[] for AppConfig.categories (uppercase for consistency) */
export function getCategoriesForConfig(): string[] {
  return CATEGORIES.map(c => c.label.toUpperCase());
}

/** Returns subcategories as Record<categoryLabel, string[]> for AppConfig.subcategories (uppercase) */
export function getSubcategoriesMapForConfig(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const cat of CATEGORIES) {
    const subs = SUBCATEGORIES.filter(s => s.categoryId === cat.id).map(s => s.label.toUpperCase());
    map[cat.label.toUpperCase()] = subs;
  }
  return map;
}

/** Returns materials as string[] for AppConfig.materials (uppercase) */
export function getMaterialsForConfig(): string[] {
  return MATERIALS.map(m => m.label.toUpperCase());
}
