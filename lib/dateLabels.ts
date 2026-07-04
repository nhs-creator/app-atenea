export const formatShortDate = (d: Date = new Date()) => {
  const formatted = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  return formatted.replace(',', '');
};

// Mismo formato que formatShortDate pero con el día de la semana abreviado
// a 3 letras, para que quepa en espacios angostos (ej. DaySelector) sin
// cortarse en combinaciones largas como "miércoles ... septiembre".
export const formatSelectorDate = (d: Date) => {
  const formatted = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(d);
  return formatted.replace('.', '').replace(',', '');
};
