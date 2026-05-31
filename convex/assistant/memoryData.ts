import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

export const createMemoryInternal = internalMutation({
  args: {
    userId: v.string(),
    summary: v.string(),
    embedding: v.array(v.float64()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assistantMemories", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getMemoriesInternal = internalQuery({
  args: { ids: v.array(v.id("assistantMemories")) },
  handler: async (ctx, { ids }) => {
    const rows = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return rows.filter(
      (m): m is Doc<"assistantMemories"> => m !== null
    );
  },
});

export type AssistantMemoryId = Id<"assistantMemories">;
