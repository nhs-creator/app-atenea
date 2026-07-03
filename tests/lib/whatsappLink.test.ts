import { describe, it, expect } from "bun:test";
import { buildWhatsAppChatUrl } from '../../lib/whatsappLink';

describe('buildWhatsAppChatUrl', () => {
  it('agrega el prefijo 549 a un número simple sin 0 ni 15', () => {
    expect(buildWhatsAppChatUrl('1122334455')).toBe('https://wa.me/5491122334455');
  });

  it('saca el 0 de larga distancia si está', () => {
    expect(buildWhatsAppChatUrl('01122334455')).toBe('https://wa.me/5491122334455');
  });

  it('no duplica el prefijo si el número ya viene con 54', () => {
    expect(buildWhatsAppChatUrl('5491122334455')).toBe('https://wa.me/5491122334455');
  });

  it('ignora caracteres no numéricos', () => {
    expect(buildWhatsAppChatUrl('(11) 2233-4455')).toBe('https://wa.me/5491122334455');
  });
});
