import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Save, List, Plus, Trash2 } from 'lucide-react';

interface SettingsViewProps {
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
  onSyncInventory: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ config, onSaveConfig }) => {
  // Estados para diccionarios
  const [categories, setCategories] = useState(config.categories);
  const [subcategories, setSubcategories] = useState(config.subcategories);
  const [materials, setMaterials] = useState(config.materials);

  const [newCat, setNewCat] = useState('');
  const [selectedCatForSub, setSelectedCatForSub] = useState(categories[0] || '');
  const [newSub, setNewSub] = useState('');
  const [newMat, setNewMat] = useState('');

  const handleSave = () => {
    onSaveConfig({ 
      ...config, 
      categories,
      subcategories,
      materials
    });
    alert('Configuración guardada correctamente.');
  };

  const addCategory = () => {
    if (!newCat.trim() || categories.includes(newCat.trim())) return;
    const cat = newCat.trim();
    setCategories([...categories, cat]);
    setSubcategories({ ...subcategories, [cat]: [] });
    setNewCat('');
    if (!selectedCatForSub) setSelectedCatForSub(cat);
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
    const newSubs = { ...subcategories };
    delete newSubs[cat];
    setSubcategories(newSubs);
  };

  const addSubcategory = () => {
    if (!newSub.trim() || !selectedCatForSub) return;
    const currentSubs = subcategories[selectedCatForSub] || [];
    if (currentSubs.includes(newSub.trim())) return;
    setSubcategories({
      ...subcategories,
      [selectedCatForSub]: [...currentSubs, newSub.trim()]
    });
    setNewSub('');
  };

  const removeSubcategory = (cat: string, sub: string) => {
    setSubcategories({
      ...subcategories,
      [cat]: (subcategories[cat] || []).filter(s => s !== sub)
    });
  };

  const addMaterial = () => {
    if (!newMat.trim() || materials.includes(newMat.trim())) return;
    setMaterials([...materials, newMat.trim()]);
    setNewMat('');
  };

  const removeMaterial = (mat: string) => {
    setMaterials(materials.filter(m => m !== mat));
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
                <div key={cat} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-200">
                  {cat}
                  <button onClick={() => removeCategory(cat)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
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
                  <div key={sub} className="bg-white text-indigo-600 px-2 py-1 rounded-md text-[10px] font-black uppercase border border-indigo-100 flex items-center gap-1.5">
                    {sub}
                    <button onClick={() => removeSubcategory(selectedCatForSub, sub)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-2.5 h-2.5"/></button>
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
                <div key={mat} className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-teal-100 flex items-center gap-2">
                  {mat}
                  <button onClick={() => removeMaterial(mat)} className="text-teal-300 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
