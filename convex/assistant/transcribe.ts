import { v } from "convex/values";
import Groq from "groq-sdk";
import { action } from "../_generated/server";

/**
 * Transcribe audio (webm/mp4/wav) a español con Groq whisper-large-v3.
 * El audio llega como ArrayBuffer; mantener capturas cortas (<60s).
 * Si falla devuelve '' para no bloquear la captura.
 */
export const transcribeAudio = action({
  args: {
    audio: v.bytes(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, { audio, mimeType }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[transcribeAudio] GROQ_API_KEY no configurada");
      return "";
    }
    try {
      const groq = new Groq({ apiKey });
      const type = mimeType ?? "audio/webm";
      const ext = type.includes("mp4") ? "mp4" : type.includes("wav") ? "wav" : "webm";
      const file = new File([audio], `audio.${ext}`, { type });
      const result = (await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        language: "es",
        response_format: "text",
      })) as unknown as string | { text?: string };
      if (typeof result === "string") return result.trim();
      return result?.text?.trim() ?? "";
    } catch (err) {
      console.error("[transcribeAudio] Groq error:", err);
      return "";
    }
  },
});
