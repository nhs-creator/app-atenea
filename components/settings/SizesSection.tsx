import React from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

interface SizesSectionProps {
  categories: string[];
  sizeSystems: Record<string, string[]>;
  categorySizeMap: Record<string, string>;
  newSizeSystemName: string;
  setNewSizeSystemName: (v: string) => void;
  addSizeSystem: () => void;
  removeSizeSystem: (name: string) => void;
  selectedSizeSystem: string;
  setSelectedSizeSystem: (name: string) => void;
  newSizeLabel: string;
  setNewSizeLabel: (v: string) => void;
  addSizeToSystem: () => void;
  removeSizeFromSystem: (systemName: string, sizeLabel: string) => void;
  setCategorySizeSystem: (cat: string, systemKey: string) => void;
  onSave: () => void;
}

const SizesSection: React.FC<SizesSectionProps> = ({
  categories, sizeSystems, categorySizeMap,
  newSizeSystemName, setNewSizeSystemName, addSizeSystem, removeSizeSystem,
  selectedSizeSystem, setSelectedSizeSystem, newSizeLabel, setNewSizeLabel, addSizeToSystem, removeSizeFromSystem,
  setCategorySizeSystem, onSave,
}) => {
  return (
    <div className="p-4 space-y-6">
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Sistemas de talles</label>
        <p className="text-[10px] text-slate-500 mb-2">Cada sistema define una lista de talles (ej: LETRAS = S, M, L, XL)</p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSizeSystemName}
            onChange={(e) => setNewSizeSystemName(e.target.value)}
            placeholder="Ej: TALLES_KIDS"
            className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
          />
          <button onClick={addSizeSystem} className="bg-amber-600 text-white w-10 h-10 rounded-lg flex items-center justify-center active:scale-90"><Plus className="w-5 h-5"/></button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(sizeSystems).map(name => (
            <div key={name} className="bg-amber-50 text-amber-800 px-3 py-2 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-2">
              {name}
              <button type="button" onClick={() => removeSizeSystem(name)} disabled={Object.keys(sizeSystems).length <= 1} className="min-w-[44px] min-h-[44px] -m-1 flex items-center justify-center rounded-lg text-amber-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" aria-label={`Eliminar sistema ${name}`}><Trash2 className="w-5 h-5"/></button>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Talles de {selectedSizeSystem}</label>
          <select
            value={selectedSizeSystem}
            onChange={(e) => setSelectedSizeSystem(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold mb-3"
          >
            {Object.keys(sizeSystems).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newSizeLabel}
              onChange={(e) => setNewSizeLabel(e.target.value)}
              placeholder="Ej: 52, XXS, 1"
              className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm"
            />
            <button onClick={addSizeToSystem} className="bg-amber-600 text-white w-10 h-10 rounded-lg flex items-center justify-center active:scale-90"><Plus className="w-5 h-5"/></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(sizeSystems[selectedSizeSystem] || []).map(s => (
              <div key={s} className="bg-white text-amber-700 px-2 py-1.5 rounded-md text-[10px] font-black border border-amber-100 flex items-center gap-1">
                {s}
                <button type="button" onClick={() => removeSizeFromSystem(selectedSizeSystem, s)} className="min-w-[44px] min-h-[44px] -m-0.5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50" aria-label={`Quitar talle ${s}`}><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Categoría → Sistema de talles</label>
          <p className="text-[10px] text-slate-500 mb-3">Asigna qué sistema de talles usa cada categoría</p>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-xs font-bold text-slate-700 truncate flex-1">{cat}</span>
                <select
                  value={categorySizeMap[cat] || 'UNICO'}
                  onChange={(e) => setCategorySizeSystem(cat, e.target.value)}
                  className="h-9 px-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold min-w-[100px]"
                >
                  {Object.keys(sizeSystems).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
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

export default SizesSection;
