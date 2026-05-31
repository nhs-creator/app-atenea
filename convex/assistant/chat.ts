"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { GenericActionCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";
import { embedText } from "./memory";
import { TOOL_DEFS, executeTool } from "./tools";

type ActionCtx = GenericActionCtx<DataModel>;

const HAIKU_MODEL = "anthropic/claude-haiku-4-5";
const MAX_ITERATIONS = 5;
const MAX_HISTORY_MESSAGES = 20;
const SUMMARIZE_BATCH = 6;

const SYSTEM_PROMPT = `Sos "Atenea", la asistente del local de ropa. Hablás con la dueña, una señora de unos 56 años que NO es técnica y ve poco. Tu trabajo es responder sobre sus ventas, gastos y stock, y ayudarla a anotar cosas.

CÓMO HABLAR:
- Español rioplatense, cálido y simple, como una empleada de confianza.
- Respuestas CORTAS y claras. Una o dos frases. Nada de jerga contable ni tecnicismos.
- Los montos escribilos TAL CUAL te los da la herramienta, con el signo $ y punto de miles (ej: "$859.400", "$7.717.600"). NO los reescribas en palabras ("859 mil 400") ni les agregues centavos.
- TEXTO PLANO: no uses asteriscos ni negritas (markdown), la pantalla no los entiende. Pero SÍ usá saltos de línea para separar cosas. Escribí como en un WhatsApp.
- LISTAS: cuando enumeres varios productos o datos, poné CADA ítem en su PROPIA LÍNEA (con un salto de línea real), nunca todo seguido en un párrafo. Formato simple por línea, por ejemplo: "Suéter lanilla — $447.400 (12 u.)". Si la lista es larga, mostrá los 10 principales salvo que te pidan expresamente todos.
- Si no sabés algo, decilo simple. Nunca inventes números.

CÓMO USAR LAS HERRAMIENTAS (tools):
- Para CUALQUIER pregunta sobre plata, ventas, gastos, productos o stock, usá la tool correspondiente. NUNCA respondas números de memoria.
- "ganancia del negocio" = ventas menos gastos del negocio. "te quedó en caja" = eso menos los retiros personales.
- GASTOS (record_expense): confirmá en una frase y cuando diga que sí, ejecutá la tool en ese mismo turno. No digas "anotado" si no ejecutaste la tool.
- VENTAS (propose_sale): NO se guardan directo. Llamás propose_sale y aparece un CARTELITO en pantalla con los datos; la usuaria toca Confirmar y ahí se guarda. Cuando llames propose_sale, decí algo corto como "Listo, fijate el cartelito y confirmá 👇". NUNCA digas que la venta "quedó guardada/anotada" — todavía no lo está hasta que ella confirme.
- UNA CLIENTA vs VARIAS: si los productos son de la MISMA clienta, es UNA venta → una sola llamada a propose_sale con todos los items. Si son de clientas DISTINTAS, es una venta por clienta → una llamada de propose_sale POR CADA clienta. Si no queda claro si es una o varias clientas, PREGUNTÁ: "¿es todo de la misma clienta o son ventas distintas?". Si menciona el nombre de la clienta, pasalo en clientLabel.
- MEDIOS DE PAGO MÚLTIPLES (pago combinado): es normal pagar con varios medios. Si dice "pagó 30 mil en efectivo y 35 mil por transferencia", pasá payments con las dos entradas. La suma de los pagos debería dar el total.
- DESCUENTO: si paga en efectivo puede haber descuento (ej. 10%) — si lo menciona, pasalo en discountPercent; si no, no preguntes de más. CRÉDITO en cuotas: preguntá "¿en cuántas cuotas?" y poné el número en installments del pago en Crédito.

Si te saluda o charla, respondé corto y amable sin llamar tools.

COMO EXPERTA EN COMPRAS / INVENTARIO:
Cuando te pregunten qué comprar o reponer para el mes o la temporada que viene, actuás como una experta en compras de un local de ropa. Pedí get_inventory_analysis y razoná con los datos reales. IMPORTANTE: todavía no hay un stock cargado, así que tu recomendación sale 100% de las VENTAS, nunca del stock. No hables de stock disponible ni de "lo que queda en depósito".
- Priorizá reforzar lo que MÁS se vendió.
- Mirá la tendencia: si un producto vendió más que el mes pasado, viene en alza (reforzá); si vendió menos, está frenando (afló).
- Tené en cuenta la temporada (la tool te dice la actual y la próxima). En un local de ropa, al entrar a una temporada conviene reforzar la ropa de esa estación y aflojar la de la anterior (ej: entrando el invierno, priorizar abrigo y bajar lo de verano).
- Cerrá con una recomendación CONCRETA y corta: qué reforzar, qué frenar y por qué, en lenguaje simple. Sin tecnicismos, sin tablas largas.`;

const modeNote = (s: string) => s; // placeholder por si se agregan modos

/**
 * Action principal del chat: tool use + prompt caching + compactación + RAG.
 */
export const sendMessage = action({
  args: {
    conversationId: v.id("assistantConversations"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ content: string }> => {
    const userId = await ctx.runQuery(internal.assistant.data.whoami, {});
    if (!userId) throw new Error("No autenticado");

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) throw new Error("AI_GATEWAY_API_KEY no configurada");
    const anthropic = new Anthropic({
      apiKey,
      baseURL: "https://ai-gateway.vercel.sh",
    });

    // 1. Guardar el mensaje de la usuaria.
    await ctx.runMutation(internal.assistant.conversations.addMessageInternal, {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
    });

    // 2. Compactación: comprimir mensajes viejos al rolling summary si hace falta.
    const rollingSummary = await summarizeIfNeeded(
      ctx,
      args.conversationId,
      anthropic
    );

    // 3. Placeholder de assistant (pending) — el UI muestra "Pensando…".
    const assistantIndex = await ctx.runMutation(
      internal.assistant.conversations.startPendingAssistantInternal,
      { conversationId: args.conversationId }
    );

    try {
      // 4. RAG: recuperar memorias relevantes.
      const memories = await retrieveMemories(ctx, userId, args.content);

      // 5. System blocks. La base estática lleva cache_control (se cachea junto
      //    con las tools, que van primero en el render order). Lo dinámico
      //    (resumen + memorias) va después, sin cachear.
      const systemBlocks: Anthropic.TextBlockParam[] = [
        {
          type: "text",
          text: modeNote(SYSTEM_PROMPT),
          cache_control: { type: "ephemeral" },
        },
      ];
      if (rollingSummary) {
        systemBlocks.push({
          type: "text",
          text: `## Resumen de lo hablado antes en esta charla\n${rollingSummary}`,
        });
      }
      if (memories.length > 0) {
        systemBlocks.push({
          type: "text",
          text:
            "## Cosas que recordás de charlas anteriores con ella\n" +
            memories.map((m) => `- ${m.summary}`).join("\n"),
        });
      }

      // 6. Historial (últimos N, sin el placeholder pending).
      const conv = await ctx.runQuery(
        internal.assistant.conversations.getInternal,
        { conversationId: args.conversationId }
      );
      if (!conv) throw new Error("Conversación no encontrada");
      const history = conv.messages
        .filter((m, i) => i !== assistantIndex && !m.pending && m.content.trim())
        .slice(-MAX_HISTORY_MESSAGES);
      const messages: Anthropic.MessageParam[] = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 7. Loop agéntico.
      let finalText = "";
      const toolsUsed = new Set<string>();
      let iteration = 0;

      while (iteration < MAX_ITERATIONS) {
        iteration += 1;
        const res = await anthropic.messages.create({
          model: HAIKU_MODEL,
          max_tokens: 1500,
          system: systemBlocks,
          tools: TOOL_DEFS as unknown as Anthropic.Tool[],
          messages,
        });

        const textBlocks = res.content.filter(
          (b): b is Anthropic.TextBlock => b.type === "text"
        );
        if (textBlocks.length) finalText = textBlocks.map((b) => b.text).join("");

        const toolUses = res.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        if (res.stop_reason !== "tool_use" || toolUses.length === 0) break;

        // Ejecutar las tools pedidas.
        const assistantContent: Anthropic.ContentBlockParam[] = res.content.map(
          (b) => b as Anthropic.ContentBlockParam
        );
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          toolsUsed.add(tu.name);
          const result = await executeTool(
            ctx,
            userId,
            args.conversationId,
            tu.name,
            (tu.input ?? {}) as Record<string, unknown>
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: result,
          });
        }
        messages.push({ role: "assistant", content: assistantContent });
        messages.push({ role: "user", content: toolResults });
        // Reflejar en el UI qué tools se están usando.
        await ctx.runMutation(
          internal.assistant.conversations.updateAssistantInternal,
          {
            conversationId: args.conversationId,
            index: assistantIndex,
            content: finalText || "…",
            tools: Array.from(toolsUsed),
          }
        );
      }

      // 8. Persistir respuesta final.
      await ctx.runMutation(
        internal.assistant.conversations.updateAssistantInternal,
        {
          conversationId: args.conversationId,
          index: assistantIndex,
          content: finalText || "Perdón, no pude responder eso.",
          tools: Array.from(toolsUsed),
          done: true,
        }
      );

      // 9. Auto-título en el primer intercambio.
      if (!conv.title) {
        const title =
          args.content.trim().slice(0, 40) +
          (args.content.length > 40 ? "…" : "");
        await ctx.runMutation(
          internal.assistant.conversations.setTitleInternal,
          { conversationId: args.conversationId, title }
        );
      }

      return { content: finalText };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      console.error("[assistant.chat.sendMessage]", err);
      await ctx.runMutation(
        internal.assistant.conversations.updateAssistantInternal,
        {
          conversationId: args.conversationId,
          index: assistantIndex,
          content: "Uy, tuve un problema para responder. Probá de nuevo en un ratito.",
          done: true,
        }
      );
      throw err;
    }
  },
});

/** RAG: top memorias por similitud, score > 0.5. */
async function retrieveMemories(
  ctx: ActionCtx,
  userId: string,
  query: string
): Promise<Doc<"assistantMemories">[]> {
  try {
    const vector = await embedText(query);
    const results = await ctx.vectorSearch("assistantMemories", "by_embedding", {
      vector,
      limit: 4,
      filter: (q) => q.eq("userId", userId),
    });
    const relevant = results.filter((r) => r._score > 0.5);
    if (relevant.length === 0) return [];
    return await ctx.runQuery(internal.assistant.memoryData.getMemoriesInternal, {
      ids: relevant.map((r) => r._id as Id<"assistantMemories">),
    });
  } catch (err) {
    console.error("[assistant.chat.retrieveMemories]", err);
    return [];
  }
}

/**
 * Compactación. Mantiene los últimos MAX_HISTORY_MESSAGES crudos; lo anterior se
 * comprime al rolling summary cuando hay al menos SUMMARIZE_BATCH mensajes nuevos
 * fuera de la ventana. Así el contexto enviado no crece sin control.
 */
async function summarizeIfNeeded(
  ctx: ActionCtx,
  conversationId: Id<"assistantConversations">,
  anthropic: Anthropic
): Promise<string | undefined> {
  const conv = await ctx.runQuery(
    internal.assistant.conversations.getInternal,
    { conversationId }
  );
  if (!conv) return undefined;

  const len = conv.messages.length;
  const windowStart = Math.max(0, len - MAX_HISTORY_MESSAGES);
  const summarizedUpTo = conv.summarizedUpTo ?? 0;
  if (windowStart - summarizedUpTo < SUMMARIZE_BATCH) return conv.summary;

  const toCompress = conv.messages
    .slice(summarizedUpTo, windowStart)
    .filter((m) => !m.pending && m.content.trim())
    .map((m) => `${m.role === "user" ? "Dueña" : "Atenea"}: ${m.content}`)
    .join("\n");

  const userPrompt = conv.summary
    ? `Resumen previo:\n${conv.summary}\n\nMensajes nuevos a integrar:\n${toCompress}\n\nDevolvé un resumen actualizado, máximo 250 palabras, en español rioplatense, conservando lo importante.`
    : `Mensajes:\n${toCompress}\n\nResumí en máximo 250 palabras, español rioplatense, conservando lo importante.`;

  try {
    const res = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 600,
      system:
        "Comprimís historiales de chat en resúmenes densos y precisos. Conservás qué pidió la dueña, datos relevantes y decisiones. Omitís montos puntuales que caducan. Sin meta-comentarios.",
      messages: [{ role: "user", content: userPrompt }],
    });
    const newSummary = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (newSummary) {
      await ctx.runMutation(
        internal.assistant.conversations.updateSummaryInternal,
        { conversationId, summary: newSummary, summarizedUpTo: windowStart }
      );
      return newSummary;
    }
    return conv.summary;
  } catch (err) {
    console.error("[assistant.chat.summarizeIfNeeded]", err);
    return conv.summary;
  }
}
