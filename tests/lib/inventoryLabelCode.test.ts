import { describe, it, expect } from "bun:test";
import { composeInventoryLabelCode, parseInventoryLabelCode } from '../../lib/inventoryLabelCode';

describe('composeInventoryLabelCode', () => {
  it('agrega el talle con un guion cuando hay talle', () => {
    expect(composeInventoryLabelCode('ATN-7F3A9C21', '38')).toBe('ATN-7F3A9C21-38');
  });

  it('devuelve el código solo cuando no hay talle', () => {
    expect(composeInventoryLabelCode('ATN-7F3A9C21')).toBe('ATN-7F3A9C21');
  });

  it('devuelve el código solo cuando el talle es "UNICO" (sin importar mayúsculas)', () => {
    expect(composeInventoryLabelCode('ATN-7F3A9C21', 'unico')).toBe('ATN-7F3A9C21');
    expect(composeInventoryLabelCode('ATN-7F3A9C21', 'UNICO')).toBe('ATN-7F3A9C21');
  });

  it('devuelve el código solo cuando el talle es string vacío', () => {
    expect(composeInventoryLabelCode('ATN-7F3A9C21', '')).toBe('ATN-7F3A9C21');
  });
});

describe('parseInventoryLabelCode', () => {
  it('separa código de producto y talle ida y vuelta', () => {
    const composed = composeInventoryLabelCode('ATN-7F3A9C21', '38');
    expect(parseInventoryLabelCode(composed)).toEqual({ itemCode: 'ATN-7F3A9C21', size: '38' });
  });

  it('funciona con talles alfabéticos', () => {
    const composed = composeInventoryLabelCode('ATN-7F3A9C21', 'XL');
    expect(parseInventoryLabelCode(composed)).toEqual({ itemCode: 'ATN-7F3A9C21', size: 'XL' });
  });

  it('un código viejo (sin talle) no tiene size', () => {
    expect(parseInventoryLabelCode('ATN-7F3A9C21')).toEqual({ itemCode: 'ATN-7F3A9C21' });
  });

  it('un QR ajeno más corto que el prefijo se devuelve entero como itemCode', () => {
    expect(parseInventoryLabelCode('123456')).toEqual({ itemCode: '123456' });
  });

  it('un QR más largo pero sin el separador en la posición esperada no se interpreta como talle', () => {
    expect(parseInventoryLabelCode('ATN-7F3A9C21XX38')).toEqual({ itemCode: 'ATN-7F3A9C21XX38' });
  });
});
