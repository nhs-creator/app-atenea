"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";

const AI_GATEWAY_BASE = "https://ai-gateway.vercel.sh/v1";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const HAIKU_MODEL = "anthropic/claude-haiku-4-5";

function gatewayKey(): string {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key)
    throw new Error("AI_GATEWAY_API_KEY no configurada en Convex env vars");
  return key;
}

/** Vectoriza texto vía Vercel AI Gateway (endpoint OpenAI-compatible). */
export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${AI_GATEWAY_BASE}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayKey()}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text, dimensions: 1536 }),
  });
  if (!res.ok)
    throw new Error(`Embeddings falló: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

/** Resumen denso de un transcript con Haiku (vía gateway chat/completions). */
async function summarizeConversation(transcript: string): Promise<string> {
  const system =
    "Sos el archivador de memoria de un asistente de finanzas para una comerciante. Resumí la conversación en un párrafo denso (máximo 150 palabras) que conserve: qué preguntó/pidió la usuaria, qué datos relevantes salieron, decisiones tomadas y preferencias suyas. NO incluyas montos puntuales ni datos que caduquen (cotizaciones, ventas de un día). Capturá patrones y preferencias estables. Español rioplatense, sin meta-comentarios.";
  const res = await fetch(`${AI_GATEWAY_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayKey()}`,
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Conversación:\n\n${transcript}` },
      ],
    }),
  });
  if (!res.ok)
    throw new Error(`Resumen falló: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return (data.choices[0]?.message?.content ?? "").trim();
}

/**
 * Procesa una conversación cerrada: la resume, la vectoriza y la guarda como
 * memoria (RAG). Marca la conversación como procesada para no repetirla.
 */
export const processConversation = internalAction({
  args: { conversationId: v.id("assistantConversations") },
  handler: async (ctx, { conversationId }) => {
    const conv = await ctx.runQuery(
      internal.assistant.conversations.getInternal,
      { conversationId }
    );
    if (!conv || conv.processed) return { saved: false };

    const real = conv.messages.filter((m) => !m.pending && m.content.trim());
    if (real.length < 2) {
      // Nada sustancioso que recordar.
      await ctx.runMutation(internal.assistant.conversations.markProcessedInternal, {
        conversationId,
      });
      return { saved: false };
    }

    const transcript = real
      .map((m) => `${m.role === "user" ? "Usuaria" : "Asistente"}: ${m.content}`)
      .join("\n\n");

    try {
      const summary = await summarizeConversation(transcript);
      if (summary) {
        const embedding = await embedText(summary);
        await ctx.runMutation(internal.assistant.memoryData.createMemoryInternal, {
          userId: conv.userId,
          summary,
          embedding,
          source: `conversation:${conversationId}`,
        });
      }
    } catch (err) {
      console.error("[assistant.memory.processConversation]", err);
    }

    await ctx.runMutation(internal.assistant.conversations.markProcessedInternal, {
      conversationId,
    });
    return { saved: true };
  },
});

/** Cron: procesa conversaciones inactivas (cerradas de hecho) a memoria. */
export const processIdleConversations = internalAction({
  args: {},
  handler: async (ctx) => {
    const idle: Doc<"assistantConversations">[] = await ctx.runQuery(
      internal.assistant.conversations.listUnprocessedIdleInternal,
      { idleMs: 1000 * 60 * 30 } // 30 minutos de inactividad
    );
    for (const c of idle) {
      await ctx.runAction(internal.assistant.memory.processConversation, {
        conversationId: c._id,
      });
    }
    return { processed: idle.length };
  },
});
