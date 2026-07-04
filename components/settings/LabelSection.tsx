import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { LABEL_SIZE_PRESETS, LABEL_SIZE_LABELS, LabelSizeId } from '../../lib/labelSizes';
import { printInventoryLabelCanvas } from '../../lib/generateInventoryLabel';

interface LabelSectionProps {
  labelSize: LabelSizeId;
  setLabelSize: (id: LabelSizeId) => void;
  onSave: () => void;
}

// Datos de ejemplo, solo para la vista previa — no representan un producto real.
const PREVIEW_DATA = { code: 'ATN-7F3A9C21', productName: 'Ejemplo de producto', price: 12500 };

const LabelSection: React.FC<LabelSectionProps> = ({ labelSize, setLabelSize, onSave }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = await printInventoryLabelCanvas(PREVIEW_DATA, labelSize);
      if (!cancelled) setPreviewUrl(canvas.toDataURL('image/png'));
    })();
    return () => { cancelled = true; };
  }, [labelSize]);

  return (
    <div className="p-4 space-y-6">
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tamaño del rollo</label>
        <p className="text-[10px] text-slate-500 mb-3">
          Ancho del rollo de etiquetas cargado en la impresora NIIMBOT D110. Un rollo más ancho permite un QR más
          grande, más fácil de leer con celulares viejos — necesitás comprar el rollo del tamaño elegido.
        </p>
        <div className="flex flex-col gap-2">
          {(Object.keys(LABEL_SIZE_PRESETS) as LabelSizeId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setLabelSize(id)}
              className={`text-left px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-[0.98] ${
                labelSize === id
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
              }`}
            >
              {LABEL_SIZE_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Vista previa</label>
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-center min-h-[100px]">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vista previa de etiqueta"
              className="w-full rounded-lg"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <span className="text-xs text-slate-400">Generando…</span>
          )}
        </div>
      </div>

      <button
        onClick={onSave}
        className="w-full bg-primary hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        <Save className="w-3.5 h-3.5" /> Guardar
      </button>
    </div>
  );
};

export default LabelSection;
