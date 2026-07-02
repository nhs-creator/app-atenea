import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Mic, Square, Loader2, Send, X, Sparkles, Check } from 'lucide-react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

const cleanText = (t: string): string =>
  t
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ');

interface InventoryVoiceAgentProps {
  onClose: () => void;
}

const InventoryVoiceAgent: React.FC<InventoryVoiceAgentProps> = ({ onClose }) => {
  const [conversationId, setConversationId] = useState<Id<'assistantConversations'> | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef(false);

  const createConversation = useMutation(api.assistant.conversations.createConversation);
  const sendMessage = useAction(api.assistant.chat.sendMessage);
  const conversation = useQuery(
    api.assistant.conversations.getConversation,
    conversationId ? { conversationId } : 'skip'
  );
  const pendingProposals = useQuery(
    api.assistant.inventoryProposals.listPendingProposals,
    conversationId ? { conversationId } : 'skip'
  );
  const confirmProposals = useMutation(api.assistant.inventoryProposals.confirmProposals);
  const cancelProposals = useMutation(api.assistant.inventoryProposals.cancelProposals);

  // Al abrir: siempre una conversación nueva (cada sesión de carga es un tema aparte).
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    createConversation({ mode: 'inventory' }).then(setConversationId).catch(console.error);
  }, [createConversation]);

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

  const { recording, transcribing, waveform, toggleMic } = useVoiceRecorder({
    disabled: sending,
    onTranscribed: (text) => setInput((prev) => (prev.trim() ? prev.trim() + ' ' : '') + text),
  });

  const handleConfirm = async () => {
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

  const handleCancel = async () => {
    if (!conversationId) return;
    try {
      await cancelProposals({ conversationId });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-100 shrink-0">
          <div className="p-2.5 bg-violet-500 rounded-2xl shadow-lg shadow-violet-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-slate-800">Cargar por voz</h2>
            <p className="text-xs font-bold text-slate-400">Describí la prenda como se la contarías a una clienta</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
          {messages.length === 0 && !sending && (
            <p className="text-sm font-bold text-slate-400 text-center pt-6">
              Tocá el micrófono y contame qué prenda entró 👇
            </p>
          )}
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] bg-violet-500 text-white rounded-3xl rounded-br-lg px-4 py-2.5 text-sm font-semibold shadow-md">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[90%] bg-slate-50 border border-slate-200 text-slate-800 rounded-3xl rounded-bl-lg px-4 py-2.5 text-sm font-semibold shadow-sm whitespace-pre-wrap break-words">
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
          <div className="px-4 pb-2 shrink-0">
            {recording ? (
              <div className="bg-rose-50 rounded-2xl py-3 px-4">
                <div className="flex items-center justify-center gap-[3px] h-8">
                  {waveform.map((v, i) => (
                    <div key={i} className="w-1.5 bg-rose-500 rounded-full transition-[height] duration-75" style={{ height: `${Math.max(4, v * 32)}px` }} />
                  ))}
                </div>
                <p className="text-center text-xs font-black text-rose-600 mt-1">Escuchando… tocá el cuadrado para terminar</p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-black bg-violet-50 text-violet-600">
                <Loader2 className="w-4 h-4 animate-spin" /> Entendiendo lo que dijiste…
              </div>
            )}
          </div>
        )}

        {/* Barra de envío */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full p-1.5">
            <button
              onClick={toggleMic}
              disabled={sending || transcribing}
              className={`p-3 rounded-full shadow-md active:scale-90 transition-all disabled:opacity-40 ${recording ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-600'}`}
              aria-label={recording ? 'Terminar de hablar' : 'Hablar'}
            >
              {recording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input); }}
              placeholder={recording ? 'Hablá…' : 'Escribí o hablá…'}
              className="flex-1 bg-transparent px-2 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
              disabled={sending || recording}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={sending || !input.trim()}
              className="p-3 bg-violet-500 text-white rounded-full shadow-md active:scale-90 transition-all disabled:opacity-40"
              aria-label="Enviar"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Propuestas pendientes */}
        {pendingProposals && pendingProposals.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 max-h-[40vh] overflow-y-auto shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              {pendingProposals.length === 1 ? 'Revisá antes de confirmar' : `Revisá las ${pendingProposals.length} propuestas`}
            </p>
            {pendingProposals.map((p) => (
              <div key={p._id} className="bg-white border-2 border-slate-100 rounded-2xl p-3 mb-2">
                <p className="font-black text-slate-800 text-sm">{p.name}</p>
                {p.kind === 'create' ? (
                  <>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {p.category && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">{p.category}</span>}
                      {p.subcategory && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">{p.subcategory}</span>}
                      {p.material && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">{p.material}</span>}
                    </div>
                    {p.detalle && <p className="text-xs text-slate-500 italic mt-1.5">{p.detalle}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(p.sizes).map(([size, qty]) => (
                        <span key={size} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-black">{size}: {qty}</span>
                      ))}
                    </div>
                    {typeof p.sellingPrice === 'number' && (
                      <p className="text-lg font-black text-primary mt-2">${Math.round(p.sellingPrice).toLocaleString('es-AR')}</p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(p.sizes).map(([size, delta]) => (
                      <span key={size} className={`rounded-lg px-2 py-0.5 text-[10px] font-black border ${delta > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {size}: {delta > 0 ? '+' : ''}{delta}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button onClick={handleCancel} disabled={confirming} className="flex-1 py-3.5 rounded-2xl bg-slate-200 text-slate-600 font-black text-sm active:scale-95 transition-all disabled:opacity-40">
                Cancelar
              </button>
              <button onClick={handleConfirm} disabled={confirming} className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-black text-sm shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : <><Check className="w-4 h-4" /> Confirmar</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryVoiceAgent;
