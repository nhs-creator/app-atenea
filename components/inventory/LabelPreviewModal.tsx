import React, { useEffect, useMemo, useState } from 'react';
import { X, Printer, Loader2, AlertCircle, Minus, Plus, Check } from 'lucide-react';
import { InventoryItem } from '../../types';

interface LabelPreviewModalProps {
  item: InventoryItem;
  buildCanvas: (item: InventoryItem, size?: string) => Promise<HTMLCanvasElement>;
  onConfirm: (opts: { size?: string; quantity: number }) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

const LabelPreviewModal: React.FC<LabelPreviewModalProps> = ({ item, buildCanvas, onConfirm, onClose }) => {
  const availableSizes = useMemo(
    () => Object.entries(item.sizes || {})
      .filter(([, qty]) => Number(qty) > 0)
      .map(([size, qty]) => ({ size, qty: Number(qty), printed: !!item.labelsPrinted?.[size] })),
    [item.sizes, item.labelsPrinted]
  );

  // Por defecto, arranca en el primer talle SIN etiqueta emitida (lo que
  // probablemente hace falta imprimir); si ya está todo impreso, el primero
  // disponible nomás — reimprimir siempre se puede, esto es solo el default.
  const defaultSize = availableSizes.find((s) => !s.printed) ?? availableSizes[0];

  const [selectedSize, setSelectedSize] = useState(defaultSize?.size);
  const [quantity, setQuantity] = useState(Math.max(1, defaultSize?.qty || 1));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const canvas = await buildCanvas(item, selectedSize);
        if (!cancelled) setPreviewUrl(canvas.toDataURL('image/png'));
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'No se pudo generar la vista previa');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, selectedSize]);

  const handleSelectSize = (size: string, qty: number) => {
    setSelectedSize(size);
    setQuantity(Math.max(1, qty));
  };

  const selectedAlreadyPrinted = availableSizes.find((s) => s.size === selectedSize)?.printed;

  const handleConfirm = async () => {
    setError('');
    setPrinting(true);
    const res = await onConfirm({ size: selectedSize, quantity });
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

          {availableSizes.length > 1 && (
            <div className="mt-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Talle</label>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map(({ size, qty, printed }) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSelectSize(size, qty)}
                    className={`relative px-3 py-2 rounded-xl text-xs font-black border-2 transition-all active:scale-95 ${
                      selectedSize === size
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                    }`}
                  >
                    {size}
                    {printed && (
                      <span
                        className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center ${
                          selectedSize === size ? 'bg-white text-violet-600' : 'bg-emerald-500 text-white'
                        }`}
                        title="Ya tiene etiqueta emitida"
                      >
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {selectedAlreadyPrinted && (
                <p className="text-[10px] text-slate-400 font-semibold mt-2">
                  Este talle ya tiene una etiqueta emitida — igual podés reimprimirla.
                </p>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cantidad de copias</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-90"
                aria-label="Restar copia"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center text-lg font-black text-slate-800">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-90"
                aria-label="Sumar copia"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
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
