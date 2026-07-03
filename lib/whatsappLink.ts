/**
 * Mejor esfuerzo: wa.me necesita el número completo en formato internacional
 * (54 + 9 + área + local, sin el 0 de larga distancia ni el 15 de celular).
 * Acá los teléfonos se cargan como "Ej: 1122334455" (ya sin 0/15), así que
 * se asume ese formato y se le agrega el prefijo. Si algún número no sigue
 * esa convención puede abrir el chat equivocado — por eso el PDF siempre
 * queda disponible para compartir a mano como respaldo, nunca es la única vía.
 */
export function buildWhatsAppChatUrl(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('54')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('15')) digits = digits.slice(2);
  if (!digits.startsWith('9')) digits = `9${digits}`;
  return `https://wa.me/54${digits}`;
}
