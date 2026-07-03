import React, { useEffect, useState } from 'react';
import { X, Printer, Loader2, AlertCircle } from 'lucide-react';
import { InventoryItem } from '../../types';

interface LabelPreviewModalProps {
  item: InventoryItem;
  buildCanvas: (item: InventoryItem) => Promise<HTMLCanvasElement>;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

const LabelPreviewModal: React.FC<LabelPreviewModalProps> = ({ item, buildCanvas, onConfirm, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const canvas = await buildCanvas(item);
        if (!cancelled) setPreviewUrl(canvas.toDataURL('image/png'));
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'No se pudo generar la vista previa');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const handleConfirm = async () => {
    setError('');
    setPrinting(true);
    const res = await onConfirm();
    setPrinting(false);
    if (res.success) onClose();
    else setError(res.error || 'Error al imprimir la etiqueta');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800">Vista previa de etiqueta</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-center min-h-[100px]">
            {loading ? (
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa de la etiqueta"
                className="w-full rounded-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : null}
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl text-xs font-black uppercase bg-slate-200 text-slate-700 active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || printing || !previewUrl}
              className="flex-1 h-12 rounded-xl text-xs font-black uppercase bg-violet-600 text-white active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {printing ? 'Imprimiendo…' : 'Imprimir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelPreviewModal;
