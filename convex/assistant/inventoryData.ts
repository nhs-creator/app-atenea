import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Busca productos existentes por nombre/detalle (substring, insensible a
 * mayúsculas). Sirve para que el agente detecte duplicados antes de proponer
 * un alta nueva, y para copiar el estilo de nombres que la dueña ya usa.
 */
export const searchSimilarInventory = internalQuery({
  args: { userId: v.string(), term: v.string() },
  handler: async (ctx, { userId, term }) => {
    const needle = term.trim().toLowerCase();
    if (!needle) return [];
    const items = await ctx.db
      .query("inventory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(needle) ||
          (i.detalle && i.detalle.toLowerCase().includes(needle))
      )
      .slice(0, 8)
      .map((i) => ({
        id: i._id,
        name: i.name,
        category: i.category,
        subcategory: i.subcategory,
        material: i.material,
        detalle: i.detalle,
        sizes: i.sizes,
        sellingPrice: i.sellingPrice,
      }));
  },
});
