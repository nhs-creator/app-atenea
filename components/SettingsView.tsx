import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Save, List, Plus, Trash2, Ruler } from 'lucide-react';
import { DEFAULT_SIZE_SYSTEMS, DEFAULT_CATEGORY_SIZE_MAP } from '../constants';

interface SettingsViewProps {
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
  onSyncInventory?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ config, onSaveConfig }) => {
  const [categories, setCategories] = useState(config.categories);
  const [subcategories, setSubcategories] = useState(config.subcategories);
  const [materials, setMaterials] = useState(config.materials);
  const [sizeSystems, setSizeSystems] = useState(config.sizeSystems || DEFAULT_SIZE_SYSTEMS);
  const [categorySizeMap, setCategorySizeMap] = useState(config.categorySizeMap || DEFAULT_CATEGORY_SIZE_MAP);

  const [newCat, setNewCat] = useState('');
  const [selectedCatForSub, setSelectedCatForSub] = useState(categories[0] || '');
  const [newSub, setNewSub] = useState('');
  const [newMat, setNewMat] = useState('');
  const [newSizeSystemName, setNewSizeSystemName] = useState('');
  const [selectedSizeSystem, setSelectedSizeSystem] = useState(Object.keys(sizeSystems)[0] || '');
  const [newSizeLabel, setNewSizeLabel] = useState('');

  const handleSave = () => {
    const normCat = (s: string) => (s || '').toUpperCase();
    const cats = categories.map(normCat);
    const subs: Record<string, string[]> = {};
    Object.entries(subcategories).forEach(([k, v]) => {
      subs[normCat(k)] = (v || []).map(normCat);
    });
    const mats = materials.map(normCat);
    const sizeMap: Record<string, string> = {};
    Object.entries(categorySizeMap).forEach(([k, v]) => {
      sizeMap[normCat(k)] = v || 'UNICO';
    });
    onSaveConfig({ 
      ...config, 
      categories: cats,
      subcategories: subs,
      materials: mats,
      sizeSystems,
      categorySizeMap: sizeMap
    });
    setCategories(cats);
    setSubcategories(subs);
    setMaterials(mats);
    setCategorySizeMap(sizeMap);
    if (cats.length && !cats.includes(selectedCatForSub)) setSelectedCatForSub(cats[0]);
    alert('Configuración guardada correctamente.');
  };

  const addCategory = () => {
    if (!newCat.trim()) return;
    const cat = newCat.trim().toUpperCase();
    if (categories.includes(cat)) return;
    setCategories([...categories, cat]);
    setSubcategories({ ...subcategories, [cat]: [] });
    setCategorySizeMap({ ...categorySizeMap, [cat]: 'UNICO' });
    setNewCat('');
    if (!selectedCatForSub) setSelectedCatForSub(cat);
  };

  const removeCategory = (cat: string) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat}"? Se eliminarán también sus subcategorías.`)) return;
    setCategories(categories.filter(c => c !== cat));
    const newSubs = { ...subcategories };
    delete newSubs[cat];
    setSubcategories(newSubs);
    const newMap = { ...categorySizeMap };
    delete newMap[cat];
    setCategorySizeMap(newMap);
  };

  const addSubcategory = () => {
    if (!newSub.trim() || !selectedCatForSub) return;
    const sub = newSub.trim().toUpperCase();
    const currentSubs = subcategories[selectedCatForSub] || [];
    if (currentSubs.includes(sub)) return;
    setSubcategories({
      ...subcategories,
      [selectedCatForSub]: [...currentSubs, sub]
    });
    setNewSub('');
  };

  const removeSubcategory = (cat: string, sub: string) => {
    if (!window.confirm(`¿Eliminar la subcategoría "${sub}" de ${cat}?`)) return;
    setSubcategories({
      ...subcategories,
      [cat]: (subcategories[cat] || []).filter(s => s !== sub)
    });
  };

  const addMaterial = () => {
    if (!newMat.trim()) return;
    const mat = newMat.trim().toUpperCase();
    if (materials.includes(mat)) return;
    setMaterials([...materials, mat]);
    setNewMat('');
  };

  const removeMaterial = (mat: string) => {
    if (!window.confirm(`¿Eliminar el material "${mat}"?`)) return;
    setMaterials(materials.filter(m => m !== mat));
  };

  const addSizeSystem = () => {
    if (!newSizeSystemName.trim()) return;
    const name = newSizeSystemName.trim().toUpperCase().replace(/\s+/g, '_');
    if (sizeSystems[name]) return;
    setSizeSystems({ ...sizeSystems, [name]: ['U'] });
    setNewSizeSystemName('');
    setSelectedSizeSystem(name);
  };

  const removeSizeSystem = (name: string) => {
    if (Object.keys(sizeSystems).length <= 1) return;
    if (!window.confirm(`¿Eliminar el sistema de talles "${name}"? Las categorías que lo usen pasarán a UNICO.`)) return;
    const next = { ...sizeSystems };
    delete next[name];
    setSizeSystems(next);
    const newMap = { ...categorySizeMap };
    Object.keys(newMap).forEach(cat => {
      if (newMap[cat] === name) newMap[cat] = 'UNICO';
    });
    setCategorySizeMap(newMap);
    if (selectedSizeSystem === name) setSelectedSizeSystem(Object.keys(next)[0] || '');
  };

  const addSizeToSystem = () => {
    if (!newSizeLabel.trim() || !selectedSizeSystem) return;
    const sizes = sizeSystems[selectedSizeSystem] || [];
    if (sizes.includes(newSizeLabel.trim())) return;
    setSizeSystems({ ...sizeSystems, [selectedSizeSystem]: [...sizes, newSizeLabel.trim()] });
    setNewSizeLabel('');
  };

  const removeSizeFromSystem = (systemName: string, sizeLabel: string) => {
    if (!window.confirm(`¿Quitar el talle "${sizeLabel}" del sistema ${systemName}?`)) return;
    const sizes = (sizeSystems[systemName] || []).filter(s => s !== sizeLabel);
    if (sizes.length === 0) return;
    setSizeSystems({ ...sizeSystems, [systemName]: sizes });
  };

  const setCategorySizeSystem = (cat: string, systemKey: string) => {
    setCategorySizeMap({ ...categorySizeMap, [cat]: systemKey });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold text-slate-800">Ajustes</h2>
        <button
          onClick={handleSave}
          className="bg-primary hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {/* Gestión de Catálogo */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <List className="w-4 h-4 text-indigo-500" />
            Gestión de Catálogo
          </h3>
        </div>
        
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
        </div>
      </div>

      {/* Gestión de Talles */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-amber-500" />
            Gestión de Talles
          </h3>
        </div>
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
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
