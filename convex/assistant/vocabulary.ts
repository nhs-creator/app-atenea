import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/** Devuelve el diccionario personal de la dueña (para inyectar en el prompt). */
export const listVocabularyInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("assistantVocabulary")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    // Las más usadas primero, tope 60 para no inflar el contexto.
    return rows
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 60)
      .map((r) => ({ term: r.term, meaning: r.meaning }));
  },
});

/**
 * Guarda o actualiza un término del diccionario. Lo llama la tool learn_term
 * cuando la dueña aclara qué significa una abreviatura suya.
 */
export const upsertTermInternal = internalMutation({
  args: { userId: v.string(), term: v.string(), meaning: v.string() },
  handler: async (ctx, { userId, term, meaning }) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized || !meaning.trim()) return;
    const existing = await ctx.db
      .query("assistantVocabulary")
      .withIndex("by_userId_term", (q) =>
        q.eq("userId", userId).eq("term", normalized)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        meaning: meaning.trim(),
        useCount: existing.useCount + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("assistantVocabulary", {
        userId,
        term: normalized,
        meaning: meaning.trim(),
        useCount: 1,
        updatedAt: Date.now(),
      });
    }
  },
});
