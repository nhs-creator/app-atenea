import React, { useEffect, useMemo, useState } from 'react';
import { InventoryFormData, InventoryItem, AppConfig } from '../../types';
import { DEFAULT_SIZE_SYSTEMS, DEFAULT_CATEGORY_SIZE_MAP } from '../../constants';
import {
  Package, Save, X, Ruler, ChevronLeft, Check, QrCode, Plus, Minus,
  Snowflake, Shirt, Layers, Sparkles, Watch, Briefcase, Gem, Home, HelpCircle,
} from 'lucide-react';
import OptionPicker from './OptionPicker';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'TEJIDOS Y ABRIGOS': Snowflake,
  'PRENDAS SUPERIORES': Shirt,
  'PRENDAS INFERIORES': Layers,
  'PIEZAS ENTERAS': Sparkles,
  'ACCESORIOS': Watch,
  'MARROQUINERÍA': Briefcase,
  'BIJOUTERIE': Gem,
  'HOGAR/HOME': Home,
  'OTROS': HelpCircle,
};

const TOTAL_STEPS = 6;

const emptyFormData = (): InventoryFormData => ({
  name: '', category: '', subcategory: '', material: '', sizes: {}, costPrice: '', sellingPrice: '', minStock: '', sku: '', barcode: '',
});

interface ProductWizardProps {
  config: AppConfig;
  onAdd: (data: InventoryFormData) => Promise<{ success: boolean; id?: string; error?: unknown }> | void;
  onGenerateLabel?: (item: InventoryItem) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

const StepHeader: React.FC<{ step: number; title: string; onBack: () => void; onClose: () => void }> = ({ step, title, onBack, onClose }) => (
  <div className="flex items-center justify-between mb-5">
    <button
      type="button"
      onClick={step === 1 ? onClose : onBack}
      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-90"
      aria-label={step === 1 ? 'Cerrar' : 'Atrás'}
    >
      {step === 1 ? <X className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
    </button>
    <div className="text-center">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paso {step} de {TOTAL_STEPS}</p>
      <h3 className="font-black text-teal-900 text-lg leading-tight">{title}</h3>
    </div>
    <div className="w-10" />
  </div>
);

const ProductWizard: React.FC<ProductWizardProps> = ({ config, onAdd, onGenerateLabel, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<InventoryFormData>(emptyFormData());
  const [submitting, setSubmitting] = useState(false);
  const [createdItem, setCreatedItem] = useState<{ id: string; name: string; sellingPrice: number } | null>(null);
  const [labelStatus, setLabelStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');

  const categories = config.categories || [];
  const materials = config.materials || [];
  const availableSubcategories = useMemo(
    () => (formData.category ? config.subcategories?.[formData.category] || [] : []),
    [formData.category, config.subcategories]
  );

  const activeSizeSystem = useMemo(() => {
    const sizeSystems = (config.sizeSystems && Object.keys(config.sizeSystems).length > 0) ? config.sizeSystems : DEFAULT_SIZE_SYSTEMS;
    const categorySizeMap = (config.categorySizeMap && Object.keys(config.categorySizeMap).length > 0) ? config.categorySizeMap : DEFAULT_CATEGORY_SIZE_MAP;
    const systemKey = categorySizeMap[(formData.category || '').toUpperCase()] || 'UNICO';
    const sizes = sizeSystems[systemKey];
    return sizes && sizes.length > 0 ? sizes : (DEFAULT_SIZE_SYSTEMS.LETRAS || ['U']);
  }, [formData.category, config.sizeSystems, config.categorySizeMap]);

  // Al entrar a talles con una categoría nueva, arrancamos todos en 0.
  useEffect(() => {
    setFormData((f) => {
      const sizes: Record<string, string> = {};
      activeSizeSystem.forEach((s) => { sizes[s] = String((f.sizes as unknown as Record<string, string>)?.[s] ?? '0'); });
      return { ...f, sizes: sizes as unknown as Record<string, number> };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSizeSystem]);

  const adjustSize = (size: string, delta: number) => {
    setFormData((f) => {
      const sizes = f.sizes as unknown as Record<string, string>;
      const current = parseInt(sizes[size] || '0', 10) || 0;
      const next = Math.max(0, current + delta);
      return { ...f, sizes: { ...sizes, [size]: String(next) } as unknown as Record<string, number> };
    });
  };

  const handleCreate = async () => {
    if (submitting) return;
    setSubmitting(true);
    const dataToAdd: InventoryFormData = {
      ...formData,
      sizes: Object.fromEntries(
        Object.entries(formData.sizes || {}).map(([s, q]) => [s, parseInt(String(q), 10) || 0])
      ) as Record<string, number>,
    };
    const result = await onAdd(dataToAdd);
    setSubmitting(false);
    if (result && result.success) {
      setCreatedItem({ id: result.id || '', name: dataToAdd.name, sellingPrice: parseFloat(dataToAdd.sellingPrice) || 0 });
      setStep(TOTAL_STEPS + 1);
    }
  };

  const handleGenerateLabel = async () => {
    if (!createdItem || !onGenerateLabel || labelStatus === 'generating') return;
    setLabelStatus('generating');
    const res = await onGenerateLabel({
      id: createdItem.id,
      name: createdItem.name,
      selling_price: createdItem.sellingPrice,
    } as InventoryItem);
    setLabelStatus(res.success ? 'done' : 'error');
  };

  const handleLoadAnother = () => {
    setFormData(emptyFormData());
    setCreatedItem(null);
    setLabelStatus('idle');
    setStep(1);
  };

  const priceInput = (label: string, field: 'costPrice' | 'sellingPrice', accent: string, required?: boolean) => (
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${accent}`}>$</span>
        <input
          type="text"
          inputMode="decimal"
          autoFocus={field === 'costPrice'}
          value={formData[field] ? parseFloat(formData[field]).toLocaleString('es-AR') : ''}
          onChange={(e) => {
            const rawValue = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
            setFormData({ ...formData, [field]: rawValue });
          }}
          className={`w-full h-14 pl-7 pr-4 rounded-2xl border border-slate-200 bg-slate-50 text-lg font-black ${accent}`}
          required={required}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-teal-100 p-6 animate-in slide-in-from-top-4 duration-300">
      {step <= TOTAL_STEPS && (
        <StepHeader
          step={step}
          title={
            step === 1 ? 'Nombre del producto'
            : step === 2 ? 'Categoría'
            : step === 3 ? 'Subcategoría'
            : step === 4 ? 'Material'
            : step === 5 ? 'Talles y cantidades'
            : 'Precios'
          }
          onBack={() => setStep((s) => Math.max(1, s - 1))}
          onClose={onClose}
        />
      )}

      {step === 1 && (
        <div className="space-y-5">
          <input
            type="text"
            autoFocus
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            placeholder="Ej: REMERA ALGODON"
            className="w-full h-16 px-5 rounded-2xl border border-slate-200 bg-slate-50 text-lg font-black focus:border-primary outline-none uppercase transition-all"
          />
          <button
            type="button"
            disabled={!formData.name.trim()}
            onClick={() => setStep(2)}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      )}

      {step === 2 && (
        <OptionPicker
          options={categories}
          icons={CATEGORY_ICONS}
          onSelect={(cat) => { setFormData({ ...formData, category: cat, subcategory: '', material: '' }); setStep(3); }}
        />
      )}

      {step === 3 && (
        <OptionPicker
          options={availableSubcategories}
          onSelect={(sub) => { setFormData({ ...formData, subcategory: sub }); setStep(4); }}
        />
      )}

      {step === 4 && (
        <OptionPicker
          options={['SIN MATERIAL', ...materials]}
          onSelect={(mat) => { setFormData({ ...formData, material: mat === 'SIN MATERIAL' ? '' : mat }); setStep(5); }}
        />
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {activeSizeSystem.map((size) => {
              const qty = parseInt(String((formData.sizes as unknown as Record<string, string>)?.[size] || '0'), 10) || 0;
              return (
                <div key={size} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center gap-2">
                  <span className="text-xs font-black text-slate-500 uppercase">{size}</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => adjustSize(size, -1)} className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-500 active:scale-90 transition-all" aria-label={`Restar ${size}`}>
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-black text-slate-800 w-8 text-center">{qty}</span>
                    <button type="button" onClick={() => adjustSize(size, 1)} className="w-11 h-11 flex items-center justify-center bg-primary text-white rounded-xl active:scale-90 transition-all" aria-label={`Sumar ${size}`}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setStep(6)}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Ruler className="w-4 h-4" /> Siguiente
          </button>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            {priceInput('Precio Costo', 'costPrice', 'text-slate-400')}
            {priceInput('Precio Venta', 'sellingPrice', 'text-primary', true)}
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Detalle (opcional)</label>
            <textarea
              value={formData.detalle || ''}
              onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
              placeholder="Ej: algodón peinado, estampado floral chico, combina con jean oxford"
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold focus:border-primary outline-none transition-all resize-none"
            />
          </div>
          <button
            type="button"
            disabled={!formData.sellingPrice || submitting}
            onClick={handleCreate}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-40"
          >
            <Save className="w-5 h-5" /> {submitting ? 'Creando...' : 'Crear producto'}
          </button>
        </div>
      )}

      {step === TOTAL_STEPS + 1 && createdItem && (
        <div className="space-y-5 text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto creado</p>
            <h3 className="font-black text-slate-800 text-lg">{createdItem.name}</h3>
          </div>

          {onGenerateLabel && (
            <button
              type="button"
              onClick={handleGenerateLabel}
              disabled={labelStatus === 'generating'}
              className="w-full bg-violet-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-60"
            >
              <QrCode className="w-5 h-5" />
              {labelStatus === 'generating' ? 'Generando...' : labelStatus === 'done' ? 'Etiqueta lista ✓' : labelStatus === 'error' ? 'Reintentar etiqueta' : 'Generar etiqueta ahora'}
            </button>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={handleLoadAnother} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2">
              <Package className="w-4 h-4" /> Cargar otro
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 text-white font-black py-4 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductWizard;
