import { useEffect, useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

const BAR_COUNT = 28;

/**
 * Graba audio del micrófono, muestra un waveform en vivo y transcribe con
 * Groq Whisper (vía Convex) al soltar. Extraído de AssistantView.tsx para
 * reusarlo también en el agente de voz de inventario — misma lógica, cero
 * cambios de comportamiento.
 */
export function useVoiceRecorder(options: { onTranscribed: (text: string) => void; disabled?: boolean }) {
  const { onTranscribed, disabled } = options;
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
    if (recording || transcribing || disabled) return;
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
          if (text && text.trim()) onTranscribed(text.trim());
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

  useEffect(() => {
    return () => {
      stopWaveform();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { recording, transcribing, waveform, toggleMic };
}
