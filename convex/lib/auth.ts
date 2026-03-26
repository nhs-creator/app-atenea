import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Extrae el userId estable del tokenIdentifier.
 * El tokenIdentifier tiene formato: "https://deployment.convex.site|userId|sessionAccountId"
 * El tercer segmento cambia por sesión, así que usamos solo los dos primeros.
 */
export function getStableUserId(tokenIdentifier: string): string {
  const parts = tokenIdentifier.split("|");
  // Usar solo los dos primeros segmentos (deployment URL + user ID)
  return parts.length >= 2 ? `${parts[0]}|${parts[1]}` : tokenIdentifier;
}

/**
 * Obtiene el userId estable del usuario autenticado.
 * Retorna null si no está autenticado.
 */
export async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return getStableUserId(identity.tokenIdentifier);
}
