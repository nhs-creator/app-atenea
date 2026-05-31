import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Sparkles, Send, Loader2, Mic, Square } from 'lucide-react';

// Limpia markdown básico (negritas, viñetas, encabezados) para que nunca se vean
// asteriscos crudos en el chat.
const cleanText = (t: string): string =>
  t
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ');

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

  // ─────────────── Input de voz (Groq Whisper via Convex) ───────────────
  const transcribe = useAction(api.assistant.transcribe.transcribeAudio);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const pickMime = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? 'audio/webm';
  };

  const startRecording = async () => {
    if (recording || transcribing || sending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMime();
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) return;
        setTranscribing(true);
        try {
          const buffer = await blob.arrayBuffer();
          const text = await transcribe({ audio: buffer, mimeType });
          if (text && text.trim()) await handleSend(text.trim());
        } catch (err) {
          console.error('transcribe', err);
        } finally {
          setTranscribing(false);
        }
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      console.error('mic', err);
      alert('No pude acceder al micrófono. Fijate de darle permiso a la app.');
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
  };

  const toggleMic = () => (recording ? stopRecording() : startRecording());

  // Limpiar el micrófono al desmontar.
  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

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
                  cleanText(m.content)
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Estado de voz */}
      {(recording || transcribing) && (
        <div className="pt-2">
          <div className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 text-base font-black ${recording ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {recording ? (
              <>
                <span className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
                Escuchando… tocá el cuadrado para terminar
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Entendiendo lo que dijiste…
              </>
            )}
          </div>
        </div>
      )}

      {/* Barra de envío */}
      <div className="pt-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full p-1.5 shadow-lg">
          {/* Micrófono */}
          <button
            onClick={toggleMic}
            disabled={sending || transcribing}
            className={`p-3 rounded-full shadow-md active:scale-90 transition-all disabled:opacity-40 ${
              recording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600'
            }`}
            aria-label={recording ? 'Terminar de hablar' : 'Hablar'}
          >
            {recording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(input);
            }}
            placeholder={recording ? 'Hablá…' : 'Escribí o hablá…'}
            className="flex-1 bg-transparent px-3 py-2.5 text-base font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
            disabled={sending || recording}
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
