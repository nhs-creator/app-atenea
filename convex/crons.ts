import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cada 30 minutos: resume las conversaciones del asistente que quedaron
// inactivas y las guarda en la memoria RAG.
crons.interval(
  "assistant-process-idle",
  { minutes: 30 },
  internal.assistant.memory.processIdleConversations,
  {}
);

export default crons;
