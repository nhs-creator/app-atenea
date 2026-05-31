import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Sparkles, Send, Loader2 } from 'lucide-react';

const SUGGESTIONS = [
  '¿Cuánto vendí este mes?',
  '¿En qué gasté más?',
  '¿Qué producto se vende más?',
  '¿Qué me falta reponer?',
];

const AssistantView: React.FC = () => {
  const [conversationId, setConversationId] = useState<Id<'assistantConversations'> | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const createConversation = useMutation(api.assistant.conversations.createConversation);
  const sendMessage = useAction(api.assistant.chat.sendMessage);
  const conversation = useQuery(
    api.assistant.conversations.getConversation,
    conversationId ? { conversationId } : 'skip'
  );

  // Crear (o reusar) una conversación al abrir.
  const createdRef = useRef(false);
  useEffect(() => {
    if (!conversationId && !createdRef.current) {
      createdRef.current = true;
      createConversation().then(setConversationId).catch(console.error);
    }
  }, [conversationId]);

  const messages = conversation?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, sending]);

  const handleSend = async (text: string) => {
    const content = text.trim();
    if (!content || !conversationId || sending) return;
    setInput('');
    setSending(true);
    try {
      await sendMessage({ conversationId, content });
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] animate-in fade-in duration-500">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="p-2.5 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-200">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Atenea</h2>
          <p className="text-xs font-bold text-slate-400">Tu asistente del local</p>
        </div>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-1 pb-2">
        {messages.length === 0 && !sending && (
          <div className="pt-6">
            <p className="text-base font-bold text-slate-500 mb-4 text-center">
              Preguntame lo que quieras 👇
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-base font-bold text-slate-700 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 shadow-sm active:scale-[0.98] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] bg-emerald-500 text-white rounded-3xl rounded-br-lg px-4 py-3 text-base font-semibold shadow-md">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="max-w-[90%] bg-white border border-slate-200 text-slate-800 rounded-3xl rounded-bl-lg px-4 py-3 text-base font-semibold shadow-sm">
                {m.pending && !m.content ? (
                  <span className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Pensando…
                  </span>
                ) : (
                  m.content
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Barra de envío */}
      <div className="pt-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full p-1.5 shadow-lg">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(input);
            }}
            placeholder="Escribí tu pregunta…"
            className="flex-1 bg-transparent px-4 py-2.5 text-base font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
            disabled={sending}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={sending || !input.trim()}
            className="p-3 bg-emerald-500 text-white rounded-full shadow-md active:scale-90 transition-all disabled:opacity-40"
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantView;
