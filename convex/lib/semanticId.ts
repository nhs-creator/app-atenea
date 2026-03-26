/**
 * Genera el ID semántico (clientNumber) para una venta.
 * Port directo de lib/semanticId.ts para usar dentro de Convex mutations.
 */
export function computeNextSemanticId(
  existingClientNumbers: string[],
  date: string,
  options: { isReturn?: boolean; isPending?: boolean }
): string {
  const prefix = options.isReturn ? "C" : options.isPending ? "S" : "V";
  const datePart = date.replace(/-/g, "").slice(2);
  const uniqueGroups = new Set(existingClientNumbers.filter(Boolean));
  const nextNum = uniqueGroups.size + 1;
  return `${prefix}${datePart}-${nextNum.toString().padStart(3, "0")}`;
}
