import { CATEGORIES, SUBCATEGORIES } from '../inventoryConstants';

export interface GoogleTaxonomyEntry {
  id: number;
  path: string;
}

/**
 * Mapeo invisible categoría/subcategoría interna -> Google Product Taxonomy.
 * No se usa en ninguna UI hoy: es infraestructura lista para el día que haga
 * falta exportar a Google Shopping / Instagram Shopping / Mercado Libre.
 * IDs verificados contra google.com/basepages/producttype/taxonomy-with-ids.en-US.txt.
 * Donde no se encontró un ID puntual (marcado "fallback"), se usa el ID de la
 * categoría padre más cercana en vez de inventar un número.
 */
export const GOOGLE_TAXONOMY_BY_SUBCATEGORY: Record<string, GoogleTaxonomyEntry> = {
  // Tejidos y Abrigos
  sueter: { id: 203, path: 'Apparel & Accessories > Clothing > Outerwear' }, // fallback
  poleron: { id: 5605, path: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets > Hoodies & Sweatshirts' },
  chaleco: { id: 203, path: 'Apparel & Accessories > Clothing > Outerwear' }, // fallback
  saco: { id: 5598, path: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets' },
  buzo: { id: 5605, path: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets > Hoodies & Sweatshirts' },
  campera: { id: 5598, path: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets' },
  ruana: { id: 203, path: 'Apparel & Accessories > Clothing > Outerwear' }, // fallback
  poncho: { id: 203, path: 'Apparel & Accessories > Clothing > Outerwear' }, // fallback
  cardigan: { id: 203, path: 'Apparel & Accessories > Clothing > Outerwear' }, // fallback

  // Prendas Superiores
  remera: { id: 212, path: 'Apparel & Accessories > Clothing > Shirts & Tops' },
  musculosa: { id: 212, path: 'Apparel & Accessories > Clothing > Shirts & Tops' },
  blusa: { id: 212, path: 'Apparel & Accessories > Clothing > Shirts & Tops' },
  camisa: { id: 212, path: 'Apparel & Accessories > Clothing > Shirts & Tops' },
  polera: { id: 212, path: 'Apparel & Accessories > Clothing > Shirts & Tops' },
  body: { id: 212, path: 'Apparel & Accessories > Clothing > Shirts & Tops' }, // fallback
  top: { id: 212, path: 'Apparel & Accessories > Clothing > Shirts & Tops' },

  // Prendas Inferiores
  jean: { id: 204, path: 'Apparel & Accessories > Clothing > Pants' },
  pantalon: { id: 204, path: 'Apparel & Accessories > Clothing > Pants' },
  palazo: { id: 204, path: 'Apparel & Accessories > Clothing > Pants' },
  babucha: { id: 204, path: 'Apparel & Accessories > Clothing > Pants' },
  short: { id: 207, path: 'Apparel & Accessories > Clothing > Shorts' },
  jogger: { id: 204, path: 'Apparel & Accessories > Clothing > Pants' },
  pollera: { id: 1581, path: 'Apparel & Accessories > Clothing > Skirts' },

  // Piezas Enteras
  vestido: { id: 2271, path: 'Apparel & Accessories > Clothing > Dresses' },
  mono: { id: 5250, path: 'Apparel & Accessories > Clothing > One-Pieces > Jumpsuits & Rompers' },

  // Accesorios
  pañuelo: { id: 177, path: 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls' },
  gorra: { id: 173, path: 'Apparel & Accessories > Clothing Accessories > Hats' },
  gorro: { id: 173, path: 'Apparel & Accessories > Clothing Accessories > Hats' },
  boina: { id: 173, path: 'Apparel & Accessories > Clothing Accessories > Hats' },
  vincha: { id: 1662, path: 'Apparel & Accessories > Clothing Accessories > Hair Accessories > Headbands' },
  bufanda: { id: 177, path: 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls' },
  chalina: { id: 177, path: 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls' },
  pashmina: { id: 177, path: 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls' },
  guante: { id: 170, path: 'Apparel & Accessories > Clothing Accessories > Gloves & Mittens' },
  miton: { id: 170, path: 'Apparel & Accessories > Clothing Accessories > Gloves & Mittens' },
  cinto: { id: 169, path: 'Apparel & Accessories > Clothing Accessories > Belts' },

  // Marroquinería
  bolso: { id: 3032, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags' },
  mochila: { id: 3032, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags' }, // fallback (Backpacks sin ID confirmado)
  cartera: { id: 3032, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags' },
  bandolera: { id: 3032, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags' },
  riñonera: { id: 3032, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags' }, // fallback
  billetera: { id: 2668, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips' },
  portacosmeticos: { id: 3032, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags' }, // fallback

  // Bijouterie
  aros: { id: 194, path: 'Apparel & Accessories > Jewelry > Earrings' },
  collares: { id: 196, path: 'Apparel & Accessories > Jewelry > Necklaces' },
  pulseras: { id: 191, path: 'Apparel & Accessories > Jewelry > Bracelets' },
  chokers: { id: 196, path: 'Apparel & Accessories > Jewelry > Necklaces' }, // fallback (tipo de collar)
  broches: { id: 197, path: 'Apparel & Accessories > Jewelry > Brooches & Lapel Pins' },
  llaveros: { id: 175, path: 'Apparel & Accessories > Handbag & Wallet Accessories > Keychains' },

  // Hogar/Home y Otros: sin equivalente confiable en Apparel & Accessories —
  // deliberadamente sin mapeo (ver GOOGLE_TAXONOMY_BY_CATEGORY).
};

/** Fallback por categoría cuando la subcategoría puntual no tiene mapeo propio. */
export const GOOGLE_TAXONOMY_BY_CATEGORY: Record<string, GoogleTaxonomyEntry> = {
  tejidos_y_abrigos: { id: 203, path: 'Apparel & Accessories > Clothing > Outerwear' },
  prendas_superiores: { id: 212, path: 'Apparel & Accessories > Clothing > Shirts & Tops' },
  prendas_inferiores: { id: 204, path: 'Apparel & Accessories > Clothing > Pants' },
  piezas_enteras: { id: 1604, path: 'Apparel & Accessories > Clothing' },
  accesorios: { id: 167, path: 'Apparel & Accessories > Clothing Accessories' },
  marroquinería: { id: 3032, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags' },
  // bijouterie, hogar_home, otros: sin fallback confiable — mejor null que un ID inventado.
};

/**
 * Devuelve el mapeo de Google Product Taxonomy para un ítem del inventario,
 * o null si no hay uno confiable (ej. categoría "Otros"). Recibe los `id`
 * estables de inventoryConstants.ts, no los labels en mayúsculas.
 */
export function getGoogleTaxonomy(categoryId: string, subcategoryId?: string): GoogleTaxonomyEntry | null {
  if (subcategoryId && GOOGLE_TAXONOMY_BY_SUBCATEGORY[subcategoryId]) {
    return GOOGLE_TAXONOMY_BY_SUBCATEGORY[subcategoryId];
  }
  return GOOGLE_TAXONOMY_BY_CATEGORY[categoryId] ?? null;
}

/** Resuelve por labels (como los guarda `inventory.category`/`subcategory`) en vez de por id. */
export function getGoogleTaxonomyByLabel(categoryLabel: string, subcategoryLabel?: string): GoogleTaxonomyEntry | null {
  const category = CATEGORIES.find((c) => c.label.toLowerCase() === categoryLabel.trim().toLowerCase());
  if (!category) return null;
  const subcategory = subcategoryLabel
    ? SUBCATEGORIES.find((s) => s.categoryId === category.id && s.label.toLowerCase() === subcategoryLabel.trim().toLowerCase())
    : undefined;
  return getGoogleTaxonomy(category.id, subcategory?.id);
}
