import { describe, it, expect } from "bun:test";
import { getGoogleTaxonomy, getGoogleTaxonomyByLabel } from '../../lib/googleTaxonomy';

describe('getGoogleTaxonomy', () => {
  it('resuelve una subcategoría con mapeo propio', () => {
    expect(getGoogleTaxonomy('prendas_superiores', 'remera')).toEqual({
      id: 212,
      path: 'Apparel & Accessories > Clothing > Shirts & Tops',
    });
  });

  it('cae al fallback de categoría si la subcategoría no tiene mapeo propio', () => {
    expect(getGoogleTaxonomy('hogar_home', 'vela')).toEqual(
      getGoogleTaxonomy('hogar_home')
    );
  });

  it('devuelve null para "Otros" (sin equivalente real de producto)', () => {
    expect(getGoogleTaxonomy('otros', 'varios')).toBeNull();
    expect(getGoogleTaxonomy('otros')).toBeNull();
  });

  it('devuelve null para categoría desconocida sin subcategoría', () => {
    expect(getGoogleTaxonomy('categoria_inexistente')).toBeNull();
  });

  it('usa el fallback de categoría cuando no se pasa subcategoría', () => {
    expect(getGoogleTaxonomy('prendas_inferiores')).toEqual({
      id: 204,
      path: 'Apparel & Accessories > Clothing > Pants',
    });
  });
});

describe('getGoogleTaxonomyByLabel', () => {
  it('resuelve por labels tal como se guardan en inventory (mayúsculas)', () => {
    expect(getGoogleTaxonomyByLabel('PRENDAS SUPERIORES', 'REMERA')).toEqual({
      id: 212,
      path: 'Apparel & Accessories > Clothing > Shirts & Tops',
    });
  });

  it('es insensible a mayúsculas/minúsculas', () => {
    expect(getGoogleTaxonomyByLabel('Prendas Superiores', 'Remera')).toEqual(
      getGoogleTaxonomyByLabel('PRENDAS SUPERIORES', 'REMERA')
    );
  });

  it('devuelve null si la categoría no existe', () => {
    expect(getGoogleTaxonomyByLabel('CATEGORIA INVENTADA')).toBeNull();
  });
});
