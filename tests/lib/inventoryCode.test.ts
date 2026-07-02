import { describe, it, expect } from "bun:test";
import { generateInventoryCode } from '../../convex/lib/inventoryCode';

describe('generateInventoryCode', () => {
  it('usa los últimos 8 caracteres del id, en mayúsculas, con prefijo ATN-', () => {
    expect(generateInventoryCode('jd7abc123xyz9988')).toBe('ATN-3XYZ9988');
  });

  it('funciona con ids más cortos que 8 caracteres', () => {
    expect(generateInventoryCode('abc12')).toBe('ATN-ABC12');
  });

  it('ids distintos generan códigos distintos', () => {
    const a = generateInventoryCode('jd7abc123xyz9988');
    const b = generateInventoryCode('jd7abc123xyz9989');
    expect(a).not.toBe(b);
  });

  it('es determinístico para el mismo id', () => {
    const id = 'kx90112233445566';
    expect(generateInventoryCode(id)).toBe(generateInventoryCode(id));
  });
});
