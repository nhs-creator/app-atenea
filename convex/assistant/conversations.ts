import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getEffectiveUserId } from "../lib/auth";

// ─────────────────────────── Público (UI) ───────────────────────────────

export const listConversations = query({
  args: {
    // Sin especificar: solo conversaciones de ventas (mode ausente o "sales") — evita
    // que el chat general retome por error una conversación del agente de inventario.
    mode: v.optional(v.union(v.literal("sales"), v.literal("inventory"))),
  },
  handler: async (ctx, { mode }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return [];
    const convs = await ctx.db
      .query("assistantConversations")
      .withIndex("by_userId_activity", (q) => q.eq("userId", userId))
      .order("desc")
      .take(60);
    const filtered = convs
      .filter((c) => (mode === "inventory" ? c.mode === "inventory" : (c.mode ?? "sales") === "sales"))
      .slice(0, 30);
    return filtered.map((c) => ({
      _id: c._id,
      title: c.title ?? "Conversación",
      lastActivityAt: c.lastActivityAt,
      messageCount: c.messages.length,
    }));
  },
});

export const getConversation = query({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) return null;
    const conv = await ctx.db.get(conversationId);
    if (!conv || conv.userId !== userId) return null;
    return conv;
  },
});

export const createConversation = mutation({
  args: {
    mode: v.optional(v.union(v.literal("sales"), v.literal("inventory"))),
  },
  handler: async (ctx, { mode }) => {
    const userId = await getEffectiveUserId(ctx);
    if (!userId) throw new Error("No autenticado");
    const now = Date.now();
    return await ctx.db.insert("assistantConversations", {
      userId,
      mode,
      messages: [],
      processed: false,
      lastActivityAt: now,
      createdAt: now,
    });
  },
});

// ─────────────────────────── Interno (action) ───────────────────────────

export const getInternal = internalQuery({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => ctx.db.get(conversationId),
});

export const addMessageInternal = internalMutation({
  args: {
    conversationId: v.id("assistantConversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, { conversationId, role, content }) => {
    const conv = await ctx.db.get(conversationId);
    if (!conv) throw new Error("Conversación no encontrada");
    const messages = [
      ...conv.messages,
      { role, content, createdAt: Date.now() },
    ];
    await ctx.db.patch(conversationId, {
      messages,
      lastActivityAt: Date.now(),
      processed: false,
    });
    return messages.length - 1;
  },
});

/** Inserta un placeholder de assistant (pending) y devuelve su índice. */
export const startPendingAssistantInternal = internalMutation({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => {
    const conv = await ctx.db.get(conversationId);
    if (!conv) throw new Error("Conversación no encontrada");
    const messages = [
      ...conv.messages,
      { role: "assistant" as const, content: "", pending: true, createdAt: Date.now() },
    ];
    await ctx.db.patch(conversationId, { messages, lastActivityAt: Date.now() });
    return messages.length - 1;
  },
});

export const updateAssistantInternal = internalMutation({
  args: {
    conversationId: v.id("assistantConversations"),
    index: v.number(),
    content: v.string(),
    tools: v.optional(v.array(v.string())),
    done: v.optional(v.boolean()),
  },
  handler: async (ctx, { conversationId, index, content, tools, done }) => {
    const conv = await ctx.db.get(conversationId);
    if (!conv) return;
    const messages = [...conv.messages];
    if (!messages[index]) return;
    messages[index] = {
      ...messages[index],
      content,
      ...(tools ? { tools } : {}),
      pending: done ? false : messages[index].pending,
    };
    await ctx.db.patch(conversationId, {
      messages,
      lastActivityAt: Date.now(),
    });
  },
});

export const updateSummaryInternal = internalMutation({
  args: {
    conversationId: v.id("assistantConversations"),
    summary: v.string(),
    summarizedUpTo: v.number(),
  },
  handler: async (ctx, { conversationId, summary, summarizedUpTo }) => {
    await ctx.db.patch(conversationId, { summary, summarizedUpTo });
  },
});

export const setTitleInternal = internalMutation({
  args: { conversationId: v.id("assistantConversations"), title: v.string() },
  handler: async (ctx, { conversationId, title }) => {
    await ctx.db.patch(conversationId, { title });
  },
});

export const markProcessedInternal = internalMutation({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => {
    await ctx.db.patch(conversationId, { processed: true });
  },
});

/**
 * Conversaciones sin procesar e inactivas hace más de `idleMs`. El cron las
 * resume a memoria (RAG).
 */
export const listUnprocessedIdleInternal = internalQuery({
  args: { idleMs: v.number() },
  handler: async (ctx, { idleMs }) => {
    const cutoff = Date.now() - idleMs;
    return await ctx.db
      .query("assistantConversations")
      .withIndex("by_processed_activity", (q) =>
        q.eq("processed", false).lt("lastActivityAt", cutoff)
      )
      .take(20);
  },
});
