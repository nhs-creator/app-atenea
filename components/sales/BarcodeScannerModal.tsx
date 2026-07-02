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
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (cancelled) return;
          cancelled = true;
          onScanRef.current(decodedText);
        },
        () => { /* frame sin código legible — esperable en la mayoría de los frames */ }
      )
      .catch(() => {
        if (!cancelled) setError('No se pudo acceder a la cámara. Revisá los permisos del navegador.');
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => { /* nunca llegó a iniciar — nada que limpiar */ });
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
            Apuntá al código QR de la etiqueta
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
