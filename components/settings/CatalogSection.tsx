import React from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

interface CatalogSectionProps {
  categories: string[];
  subcategories: Record<string, string[]>;
  materials: string[];
  newCat: string;
  setNewCat: (v: string) => void;
  addCategory: () => void;
  removeCategory: (cat: string) => void;
  selectedCatForSub: string;
  setSelectedCatForSub: (cat: string) => void;
  newSub: string;
  setNewSub: (v: string) => void;
  addSubcategory: () => void;
  removeSubcategory: (cat: string, sub: string) => void;
  newMat: string;
  setNewMat: (v: string) => void;
  addMaterial: () => void;
  removeMaterial: (mat: string) => void;
  onSave: () => void;
}

const CatalogSection: React.FC<CatalogSectionProps> = ({
  categories, subcategories, materials,
  newCat, setNewCat, addCategory, removeCategory,
  selectedCatForSub, setSelectedCatForSub, newSub, setNewSub, addSubcategory, removeSubcategory,
  newMat, setNewMat, addMaterial, removeMaterial,
  onSave,
}) => {
  return (
    <div className="p-4 space-y-6">
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Categorías</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Ej: Accesorios"
            className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
          />
          <button onClick={addCategory} className="bg-indigo-600 text-white w-10 h-10 rounded-lg flex items-center justify-center active:scale-90"><Plus className="w-5 h-5"/></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-200">
              {cat}
              <button type="button" onClick={() => removeCategory(cat)} className="min-w-[44px] min-h-[44px] -m-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label={`Eliminar categoría ${cat}`}><Trash2 className="w-5 h-5"/></button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Subcategorías de {selectedCatForSub}</label>
        <div className="space-y-4">
          <select
            value={selectedCatForSub}
            onChange={(e) => setSelectedCatForSub(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Nueva subcategoría..."
              className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm"
            />
            <button onClick={addSubcategory} className="bg-indigo-600 text-white w-10 h-10 rounded-lg flex items-center justify-center active:scale-90"><Plus className="w-5 h-5"/></button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(subcategories[selectedCatForSub] || []).map(sub => (
              <div key={sub} className="bg-white text-indigo-600 px-2 py-1.5 rounded-md text-[10px] font-black uppercase border border-indigo-100 flex items-center gap-1">
                {sub}
                <button type="button" onClick={() => removeSubcategory(selectedCatForSub, sub)} className="min-w-[44px] min-h-[44px] -m-0.5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50" aria-label={`Eliminar ${sub}`}><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Materiales</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newMat}
            onChange={(e) => setNewMat(e.target.value)}
            placeholder="Ej: Seda Fría"
            className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
          />
          <button onClick={addMaterial} className="bg-teal-600 text-white w-10 h-10 rounded-lg flex items-center justify-center active:scale-90"><Plus className="w-5 h-5"/></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {materials.map(mat => (
            <div key={mat} className="bg-teal-50 text-teal-700 px-3 py-2 rounded-lg text-xs font-bold border border-teal-100 flex items-center gap-2">
              {mat}
              <button type="button" onClick={() => removeMaterial(mat)} className="min-w-[44px] min-h-[44px] -m-1 flex items-center justify-center rounded-lg text-teal-300 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label={`Eliminar material ${mat}`}><Trash2 className="w-5 h-5"/></button>
            </div>
          ))}
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

export default CatalogSection;
