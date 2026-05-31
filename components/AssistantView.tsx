import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Sparkles, Send, Loader2, Mic, Square, PenSquare } from 'lucide-react';

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
  const conversations = useQuery(api.assistant.conversations.listConversations);
  const conversation = useQuery(
    api.assistant.conversations.getConversation,
    conversationId ? { conversationId } : 'skip'
  );
  const pendingProposals = useQuery(
    api.assistant.sales.listPendingProposals,
    conversationId ? { conversationId } : 'skip'
  );
  const confirmProposals = useMutation(api.assistant.sales.confirmProposals);
  const cancelProposals = useMutation(api.assistant.sales.cancelProposals);
  const [confirming, setConfirming] = useState(false);

  const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;

  const handleConfirmSale = async () => {
    if (!conversationId || confirming) return;
    setConfirming(true);
    try {
      await confirmProposals({ conversationId });
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelSale = async () => {
    if (!conversationId) return;
    try {
      await cancelProposals({ conversationId });
    } catch (err) {
      console.error(err);
    }
  };

  // Al abrir: retomar la última conversación; si no hay ninguna, crear una.
  const initRef = useRef(false);
  useEffect(() => {
    if (conversationId || conversations === undefined) return;
    if (conversations.length > 0) {
      setConversationId(conversations[0]._id);
    } else if (!initRef.current) {
      initRef.current = true;
      createConversation().then(setConversationId).catch(console.error);
    }
  }, [conversations, conversationId]);

  const handleNewChat = async () => {
    if (sending || recording || transcribing) return;
    setInput('');
    try {
      const id = await createConversation();
      setConversationId(id);
    } catch (err) {
      console.error(err);
    }
  };

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
  const BAR_COUNT = 28;
  const transcribe = useAction(api.assistant.transcribe.transcribeAudio);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(() => new Array(BAR_COUNT).fill(0));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const pickMime = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? 'audio/webm';
  };

  const startWaveform = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctxAudio = new Ctx();
      audioCtxRef.current = ctxAudio;
      const source = ctxAudio.createMediaStreamSource(stream);
      const analyser = ctxAudio.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const bandSize = Math.max(1, Math.floor(buf.length / BAR_COUNT));
        const next = new Array(BAR_COUNT);
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < bandSize; j++) sum += buf[i * bandSize + j] ?? 0;
          next[i] = sum / bandSize / 255;
        }
        setWaveform(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn('waveform', err);
    }
  };

  const stopWaveform = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setWaveform(new Array(BAR_COUNT).fill(0));
  };

  const startRecording = async () => {
    if (recording || transcribing || sending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startWaveform(stream);
      const mimeType = pickMime();
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        setRecording(false);
        stopWaveform();
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) return;
        setTranscribing(true);
        try {
          const buffer = await blob.arrayBuffer();
          const text = await transcribe({ audio: buffer, mimeType });
          // No enviar solo: lo dejamos en el cuadro para que lo revise y envíe.
          if (text && text.trim()) {
            setInput((prev) => (prev.trim() ? prev.trim() + ' ' : '') + text.trim());
          }
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

  // Limpiar micrófono + waveform al desmontar.
  useEffect(() => {
    return () => {
      stopWaveform();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
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
        <button
          onClick={handleNewChat}
          className="ml-auto flex items-center gap-1.5 text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full active:scale-95 transition-all"
          aria-label="Nueva conversación"
        >
          <PenSquare className="w-4 h-4" /> Nueva
        </button>
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
            <div key={i} className="flex flex-col items-start">
              <div className="max-w-[90%] bg-white border border-slate-200 text-slate-800 rounded-3xl rounded-bl-lg px-4 py-3 text-base font-semibold shadow-sm whitespace-pre-wrap break-words leading-relaxed">
                {m.pending && !m.content ? (
                  <span className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Pensando…
                  </span>
                ) : (
                  cleanText(m.content)
                )}
              </div>
              {m.tools && (m.tools.includes('record_sale') || m.tools.includes('record_expense')) && (
                <div className="mt-1.5 ml-1 flex flex-wrap gap-1.5">
                  {m.tools.includes('record_sale') && (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      ✓ Venta guardada
                    </span>
                  )}
                  {m.tools.includes('record_expense') && (
                    <span className="text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                      ✓ Gasto guardado
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Estado de voz */}
      {(recording || transcribing) && (
        <div className="pt-2">
          {recording ? (
            <div className="bg-rose-50 rounded-2xl py-3 px-4">
              <div className="flex items-center justify-center gap-[3px] h-10">
                {waveform.map((v, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-rose-500 rounded-full transition-[height] duration-75"
                    style={{ height: `${Math.max(4, v * 40)}px` }}
                  />
                ))}
              </div>
              <p className="text-center text-sm font-black text-rose-600 mt-1.5">
                Escuchando… tocá el cuadrado rojo para terminar
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-2xl py-2.5 text-base font-black bg-emerald-50 text-emerald-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Entendiendo lo que dijiste…
            </div>
          )}
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

      {/* Modal de confirmación de venta(s) */}
      {pendingProposals && pendingProposals.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4">
            <h3 className="text-xl font-black text-slate-800">
              {pendingProposals.length === 1 ? 'Confirmá la venta' : `Confirmá ${pendingProposals.length} ventas`}
            </h3>
            <p className="text-sm font-bold text-slate-400 mb-4">Revisá los datos antes de guardar</p>

            {pendingProposals.map((p) => (
              <div key={p._id} className="border-2 border-slate-100 rounded-2xl p-4 mb-3">
                {p.clientLabel && (
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-600 mb-2">
                    {p.clientLabel}
                  </p>
                )}
                {p.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-base font-bold text-slate-700 mb-1 gap-3">
                    <span>{it.quantity > 1 ? `${it.quantity}x ` : ''}{it.product}</span>
                    <span className="whitespace-nowrap">{money(it.price * it.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-100 mt-2 pt-2 space-y-0.5">
                  {p.payments.map((pay, idx) => (
                    <div key={idx} className="flex justify-between text-sm font-bold text-slate-500 gap-3">
                      <span>{pay.method}{pay.installments ? ` · ${pay.installments} cuotas` : ''}</span>
                      <span className="whitespace-nowrap">{money(pay.amount)}</span>
                    </div>
                  ))}
                </div>
                {p.discountPercent ? (
                  <p className="text-xs font-black text-amber-600 mt-1.5">{p.discountPercent}% de descuento aplicado</p>
                ) : null}
                {(() => {
                  const itemsSum = p.items.reduce((s, it) => s + it.price * it.quantity, 0);
                  const adj = Math.round(p.total - itemsSum);
                  if (adj === 0) return null;
                  return (
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {adj > 0 ? 'Ajuste (redondeo hacia arriba)' : 'Redondeo/descuento'}: {adj > 0 ? '+' : ''}{money(adj)}
                    </p>
                  );
                })()}
                <div className="flex justify-between items-center text-lg font-black text-slate-800 mt-2 pt-2 border-t-2 border-slate-100 gap-3">
                  <span>Total</span>
                  <span className="whitespace-nowrap">{money(p.total)}</span>
                </div>
              </div>
            ))}

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCancelSale}
                disabled={confirming}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-base active:scale-95 transition-all disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSale}
                disabled={confirming}
                className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-black text-base shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {confirming ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando…</> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantView;
