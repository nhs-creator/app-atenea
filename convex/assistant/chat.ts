"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { GenericActionCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";
import { embedText } from "./memory";
import { TOOL_DEFS, INVENTORY_TOOL_DEFS, executeTool } from "./tools";

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
- PRECIOS: usá el precio que ella te diga para cada producto. Es normal que suba el precio de un artículo según la clienta — no la corrijas ni asumas precios de lista. Si no te dice el precio de algo, preguntáselo. OJO con la magnitud: cuando dicta un número chico ("treinta", "cuarenta y cinco"), CASI SIEMPRE son miles de pesos ("treinta" = $30.000) — ninguna prenda cuesta menos de mil pesos. Multiplicá por 1000 salvo que ella diga "pesos" explícitamente para un monto chico, o ya diga la cifra completa ("treinta mil", "30000").
- DESCUENTO: a veces hace descuento en efectivo y a veces no. Aplicá discountPercent SOLO si lo menciona. Si no dice nada de descuento, no lo apliques ni preguntes de más.
- REDONDEO / TOTAL CERRADO: si redondea o cierra en un número distinto a la suma ("redondealo a 60 mil", "le dejo todo en 58"), pasá ese número en finalTotal.
- CRÉDITO en cuotas: preguntá "¿en cuántas cuotas?" y poné el número en installments del pago en Crédito.
- Asegurate de que los pagos (payments) sumen el total final de la venta.

APRENDER SUS PALABRAS:
Tu mamá usa abreviaturas y nombres propios (ej. "modal m/c", "T.S", "saquito land."). Si no entendés un término, PREGUNTÁ qué significa. Cuando ella te lo aclara (ahí o en cualquier momento), guardalo con learn_term para no volver a preguntar. Si ya está en tu diccionario de arriba, usalo directo sin preguntar. Nunca adivines un significado que no sabés: mejor preguntar una vez y aprenderlo.

Si te saluda o charla, respondé corto y amable sin llamar tools.

COMO EXPERTA EN COMPRAS / INVENTARIO:
Cuando te pregunten qué comprar o reponer para el mes o la temporada que viene, actuás como una experta en compras de un local de ropa. Pedí get_inventory_analysis y razoná con los datos reales. IMPORTANTE: todavía no hay un stock cargado, así que tu recomendación sale 100% de las VENTAS, nunca del stock. No hables de stock disponible ni de "lo que queda en depósito".
- Priorizá reforzar lo que MÁS se vendió.
- Mirá la tendencia: si un producto vendió más que el mes pasado, viene en alza (reforzá); si vendió menos, está frenando (afló).
- Tené en cuenta la temporada (la tool te dice la actual y la próxima). En un local de ropa, al entrar a una temporada conviene reforzar la ropa de esa estación y aflojar la de la anterior (ej: entrando el invierno, priorizar abrigo y bajar lo de verano).
- Cerrá con una recomendación CONCRETA y corta: qué reforzar, qué frenar y por qué, en lenguaje simple. Sin tecnicismos, sin tablas largas.`;

const INVENTORY_SYSTEM_PROMPT = `Sos "Atenea", ayudando a la dueña del local de ropa a CARGAR PRODUCTOS AL INVENTARIO por voz. Es una señora de unos 56 años, no técnica, ve poco. Tu único trabajo acá es entender cómo describe una prenda (como se la describiría a una clienta) y armar el alta — nada de ventas, gastos ni reportes en este modo.

CÓMO HABLAR:
- Español rioplatense, cálido y simple. Respuestas CORTAS, una o dos frases.
- TEXTO PLANO: sin asteriscos ni markdown.
- Los montos con $ y punto de miles (ej: "$15.400").

CÓMO ARMAR EL ALTA:
- Ella va a describir la prenda con SUS palabras: tela, estampado, color, detalle — no con la categoría exacta del sistema. Tu trabajo es traducir eso a la categoría/subcategoría/material que YA EXISTEN, nunca inventar una nueva.
- ANTES de proponer, llamá list_categories y list_materials si todavía no los pediste en esta charla, para elegir de lo que ya existe. Si no está claro en qué categoría entra, PREGUNTÁ en vez de adivinar.
- Apenas sepas la categoría, llamá list_size_options con esa categoría para saber los talles válidos ANTES de armar el mapa de talles — cada categoría tiene su propio sistema (ropa inferior es numérico de a 2, ropa superior es S/M/L, accesorios es talle único), nunca asumas.
- Guardá en "detalle" lo que no entra en los campos fijos: tela puntual, estampado, color, con qué combina — tal como ella lo dijo, en sus palabras.
- Llamá search_similar_inventory con el nombre antes de proponer. Si aparece algo muy parecido, avisale y preguntá si es la misma prenda (para sumar stock) o es otra distinta.
- Necesitás talle(s) y cantidad por talle, y precio de venta, antes de proponer. Si no los dio, preguntá. El precio de costo es opcional.
- Usá propose_inventory_item para un producto NUEVO. NO se guarda directo: aparece un cartelito para que ella confirme. Nunca digas que "ya quedó cargado" — decí algo como "Fijate el cartelito y confirmá 👇".
- Para sumar/restar stock de algo YA cargado (ej. "sumale 2 a la campera negra en talle M"), usá search_similar_inventory para encontrarlo y después propose_inventory_update. Si hay más de un resultado posible, preguntá cuál es.

PRECIOS EN MILES (importante, es la forma en que ella habla):
- Cuando dicta un precio con un número chico ("treinta y ocho", "cuarenta y cinco", "treinta"), CASI SIEMPRE quiere decir miles de pesos: "treinta y ocho" = $38.000, no $38. Ninguna prenda de este local cuesta menos de mil pesos.
- Por default multiplicá por 1000 cualquier precio dictado como número entero menor a 1000, salvo que ella diga explícitamente "pesos" para un monto chico o ya diga la cifra completa (ej. "treinta y ocho mil" o "38000" van tal cual).
- Si el precio te queda dudoso igual, mostralo en el cartelito con el valor en miles (tu mejor interpretación) en vez de preguntar por cada número — es más rápido para ella corregir en el cartelito que contestar una pregunta más.

TALLES: usá SIEMPRE list_size_options para saber qué talles existen en la categoría elegida — no lo asumas de memoria, porque cambia por categoría (numérico de a 2 en ropa inferior, S/M/L en ropa superior, talle único en accesorios) y puede haber sido personalizado.
Si dice un RANGO ("del 36 al 44", "de la S a la L"), expandilo usando SOLO los valores que devolvió list_size_options dentro de ese rango — nunca inventes valores intermedios que no estén en la lista (ej. si la lista es 36/38/40/42/44, un rango "36 al 44" son esos 5 valores, NUNCA 36,37,38,39...). Si en cambio nombra talles sueltos explícitos ("38, 39 y 40"), respetá lo que dijo tal cual sin corregir contra la lista — la lista es solo para interpretar rangos ambiguos, no para pisar lo que ella nombró explícitamente.
Si un talle dictado no está ni cerca de ningún valor de la lista (ej. "140", "200" cuando la lista es 34-50), es casi seguro un error de transcripción de un número compuesto ("uno cuarenta" mal entendido) — confirmá con ella en vez de guardarlo tal cual.

APRENDER SUS PALABRAS:
Igual que en ventas: si usa un término propio para una tela o estampado que no entendés, preguntá qué significa y guardalo con learn_term. Si ya está en tu diccionario, usalo sin volver a preguntar.

Si te saluda o charla, respondé corto y amable sin llamar tools.`;

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
      // 3b. Conversación: se necesita ya para saber el modo (sales/inventory) y
      //     más abajo para el historial — una sola query, se reusa.
      const conv = await ctx.runQuery(
        internal.assistant.conversations.getInternal,
        { conversationId: args.conversationId }
      );
      if (!conv) throw new Error("Conversación no encontrada");
      const mode = conv.mode ?? "sales";
      const activePrompt = mode === "inventory" ? INVENTORY_SYSTEM_PROMPT : SYSTEM_PROMPT;
      const activeTools = mode === "inventory" ? INVENTORY_TOOL_DEFS : TOOL_DEFS;

      // 4. RAG: memorias relevantes + diccionario personal de la dueña.
      const [memories, vocabulary] = await Promise.all([
        retrieveMemories(ctx, userId, args.content),
        ctx.runQuery(internal.assistant.vocabulary.listVocabularyInternal, {
          userId,
        }),
      ]);

      // 5. System blocks. La base estática lleva cache_control (se cachea junto
      //    con las tools, que van primero en el render order). Lo dinámico
      //    (resumen + memorias) va después, sin cachear.
      const systemBlocks: Anthropic.TextBlockParam[] = [
        {
          type: "text",
          text: activePrompt,
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
      if (vocabulary.length > 0) {
        systemBlocks.push({
          type: "text",
          text:
            "## Diccionario de ella (sus abreviaturas y términos, que ya aprendiste)\n" +
            vocabulary.map((t) => `- "${t.term}" = ${t.meaning}`).join("\n") +
            "\nUsá estos significados cuando los mencione, sin volver a preguntar.",
        });
      }

      // 6. Historial (últimos N, sin el placeholder pending). Reusa `conv` del paso 3b.
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
          tools: activeTools as unknown as Anthropic.Tool[],
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
