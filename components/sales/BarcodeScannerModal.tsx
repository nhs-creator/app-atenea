import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const SCANNER_ELEMENT_ID = 'atenea-barcode-scanner';

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let cancelled = false;
    // Html5Qrcode.stop() tira una excepción SÍNCRONA (no una promesa rechazada) si se
    // llama mientras el escáner todavía no terminó de iniciar (ej. cerrás el modal
    // mientras el navegador está esperando que aceptes el permiso de cámara). Por eso
    // no alcanza con .catch() en la limpieza — hay que saber si realmente llegó a
    // arrancar antes de intentar frenarlo.
    let started = false;
    // useBarCodeDetectorIfSupported: usa el detector nativo del navegador (hardware-acelerado
    // en Chrome/Android) cuando está disponible — mucho más tolerante a ángulo/foco que el
    // decoder JS puro que se usa como fallback.
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { useBarCodeDetectorIfSupported: true, verbose: false });

    // Html5Qrcode.createVideoConstraints exige que el primer argumento de start()
    // tenga EXACTAMENTE 1 clave (facingMode o deviceId, nunca ambos ni nada más).
    // Pasarle más claves (como habíamos hecho con advanced/width/height mezclados
    // acá) tira una excepción síncrona ANTES de llamar a getUserMedia — por eso
    // nunca aparecía el popup de permiso. Los constraints extra van aparte, en
    // `videoConstraints` dentro de la configuración de escaneo.
    const cameraConfig = { facingMode: 'environment' };
    // Sin `qrbox`: la librería recorta la decodificación al área del recuadro, así
    // que tenerlo obligaba a centrar el código con precisión. Sin recuadro, escanea
    // el cuadro completo de la cámara — el código puede estar en cualquier parte
    // de la imagen, no hace falta apuntar a una zona específica.
    const baseScanConfig = { fps: 10 };
    const onDecoded = (decodedText: string) => {
      if (cancelled) return;
      cancelled = true;
      onScanRef.current(decodedText);
    };
    const onFrame = () => { /* frame sin código legible — esperable en la mayoría de los frames */ };

    const describeError = (err: unknown): string => {
      const name = (err as { name?: string } | undefined)?.name;
      if (name === 'NotAllowedError') return 'Permiso de cámara denegado. Habilitalo en el ícono de candado / permisos del sitio.';
      if (name === 'NotFoundError') return 'No se encontró ninguna cámara en el dispositivo.';
      if (name === 'NotReadableError') return 'La cámara está siendo usada por otra app. Cerrala e intentá de nuevo.';
      if (name === 'OverconstrainedError') return 'La cámara no soporta la configuración pedida.';
      if (name === 'SecurityError') return 'El sitio necesita HTTPS para usar la cámara.';
      return 'No se pudo acceder a la cámara. Revisá los permisos del navegador.';
    };

    const attemptStart = async (config: typeof baseScanConfig & { videoConstraints?: MediaTrackConstraints }): Promise<unknown> => {
      try {
        await scanner.start(cameraConfig, config, onDecoded, onFrame);
        return null;
      } catch (err) {
        return err;
      }
    };

    (async () => {
      // Constraints "ricos" (foco continuo + resolución alta) primero; si el navegador
      // los rechaza (algunos dispositivos tiran OverconstrainedError), reintentamos
      // con la config mínima (la que ya andaba antes) antes de darnos por vencidos.
      const firstErr = await attemptStart({
        ...baseScanConfig,
        videoConstraints: {
          facingMode: 'environment',
          advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (cancelled) return;
      if (!firstErr) {
        started = true;
        return;
      }
      const secondErr = await attemptStart(baseScanConfig);
      if (cancelled) return;
      if (!secondErr) {
        started = true;
        return;
      }
      setError(describeError(firstErr));
    })();

    return () => {
      cancelled = true;
      if (!started) return;
      try {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => { /* ya se habrá liberado la cámara */ });
      } catch {
        /* stop() puede tirar sincrónicamente si el estado cambió justo antes */
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-500" /> Escanear código
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {error ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-700">{error}</p>
            </div>
          ) : (
            <div id={SCANNER_ELEMENT_ID} className="rounded-2xl overflow-hidden bg-slate-900" />
          )}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-3">
            Apuntá al código, puede estar en cualquier parte de la imagen
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
