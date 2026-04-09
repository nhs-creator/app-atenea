import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { AppConfig, WEEKDAY_NAMES } from '../types';
import { Save, List, Plus, Trash2, Ruler, Store, UserPlus, X, FileBarChart, Pencil, Check } from 'lucide-react';
import { DEFAULT_SIZE_SYSTEMS, DEFAULT_CATEGORY_SIZE_MAP, DEFAULT_OPEN_DAYS } from '../constants';

interface SettingsViewProps {
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
  onSyncInventory?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ config, onSaveConfig }) => {
  // --- Gestión de contadoras ---
  const accountants = useQuery(api.queries.profiles.getMyAccountants) ?? [];
  const createAccountantAction = useAction(api.actions.createAccountant.createAccountant);
  const removeAccountant = useMutation(api.mutations.profiles.removeAccountant);
  const [accountantEmail, setAccountantEmail] = useState('');
  const [accountantPassword, setAccountantPassword] = useState('');
  const [accountantError, setAccountantError] = useState('');
  const [accountantLoading, setAccountantLoading] = useState(false);

  const handleAddAccountant = async () => {
    if (!accountantEmail.trim() || !accountantPassword.trim()) return;
    if (accountantPassword.length < 6) {
      setAccountantError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setAccountantError('');
    setAccountantLoading(true);
    try {
      await createAccountantAction({ email: accountantEmail.trim(), password: accountantPassword });
      setAccountantEmail('');
      setAccountantPassword('');
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('already exists') || msg.includes('already been used')) {
        setAccountantError('Ya existe una cuenta con ese email');
      } else {
        setAccountantError(msg || 'Error al crear cuenta');
      }
    } finally {
      setAccountantLoading(false);
    }
  };

  const handleRemoveAccountant = async (profileId: Id<"profiles">) => {
    if (!window.confirm('¿Quitar esta contadora?')) return;
    try {
      await removeAccountant({ accountantProfileId: profileId });
    } catch (e: any) {
      setAccountantError(e.message || 'Error al quitar contadora');
    }
  };

  // --- Monotributo: escala AFIP + categoría actual ---
  const monotributoCats = useQuery(api.queries.monotributo.listCategories) ?? [];
  const currentMonoLetter = useQuery(api.queries.monotributo.getCurrentCategory);
  const seedMonoCategories = useMutation(api.mutations.monotributo.seedDefaultCategories);
  const updateMonoCategory = useMutation(api.mutations.monotributo.updateCategory);
  const setCurrentMonoCategory = useMutation(api.mutations.monotributo.setCurrentCategory);
  const [editingMonoId, setEditingMonoId] = useState<Id<"monotributoCategories"> | null>(null);
  const [monoEditMaxBilling, setMonoEditMaxBilling] = useState('');
  const [monoEditTotalGoods, setMonoEditTotalGoods] = useState('');
  const [monoSeeding, setMonoSeeding] = useState(false);

  const handleSeedMono = async () => {
    if (!window.confirm('¿Cargar la escala AFIP por defecto (categorías A a K)?')) return;
    setMonoSeeding(true);
    try {
      await seedMonoCategories();
    } catch (e: any) {
      alert(e.message || 'Error al inicializar');
    } finally {
      setMonoSeeding(false);
    }
  };

  const startEditMono = (cat: typeof monotributoCats[0]) => {
    setEditingMonoId(cat._id);
    setMonoEditMaxBilling(String(Math.round(cat.maxBilling)));
    setMonoEditTotalGoods(String(cat.totalGoods.toFixed(2)));
  };

  const cancelEditMono = () => {
    setEditingMonoId(null);
    setMonoEditMaxBilling('');
    setMonoEditTotalGoods('');
  };

  const saveEditMono = async () => {
    if (!editingMonoId) return;
    const parseAR = (s: string) => {
      const clean = s.replace(/[^\d.,\-]/g, '').replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };
    try {
      await updateMonoCategory({
        id: editingMonoId,
        maxBilling: parseAR(monoEditMaxBilling),
        totalGoods: parseAR(monoEditTotalGoods),
      });
      cancelEditMono();
    } catch (e: any) {
      alert(e.message || 'Error al guardar');
    }
  };

  const handleSetCurrentMono = async (letter: string) => {
    try {
      await setCurrentMonoCategory({ letter });
    } catch (e: any) {
      alert(e.message || 'Error al cambiar la categoría');
    }
  };

  const formatARS = (n: number) => Math.abs(Math.round(n)).toLocaleString('es-AR');

  const [categories, setCategories] = useState(config.categories);
  const [subcategories, setSubcategories] = useState(config.subcategories);
  const [materials, setMaterials] = useState(config.materials);
  const [sizeSystems, setSizeSystems] = useState(config.sizeSystems || DEFAULT_SIZE_SYSTEMS);
  const [categorySizeMap, setCategorySizeMap] = useState(config.categorySizeMap || DEFAULT_CATEGORY_SIZE_MAP);
  const [openDays, setOpenDays] = useState<number[]>(config.openDays ?? DEFAULT_OPEN_DAYS);

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
      categorySizeMap: sizeMap,
      openDays
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

  const toggleOpenDay = (day: number) => {
    setOpenDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  return (
    <div className="space-y-6 pb-10">
      {/* 1. Días del local abierto */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-500" />
            Días que abre el local
          </h3>
          <p className="text-xs text-slate-500 mt-1">Define qué días se muestran en el gráfico de tendencia de Reportes</p>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_NAMES.map((name, day) => (
              <label
                key={day}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  openDays.includes(day)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={openDays.includes(day)}
                  onChange={() => toggleOpenDay(day)}
                  className="sr-only"
                />
                <span className="text-sm font-bold">{name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Gestión de Contadoras */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-500" />
            Contadoras
          </h3>
          <p className="text-xs text-slate-500 mt-1">Creá una cuenta para tu contadora con email y contraseña</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <input
              type="email"
              value={accountantEmail}
              onChange={(e) => setAccountantEmail(e.target.value)}
              placeholder="Email de la contadora..."
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
              disabled={accountantLoading}
            />
            <div className="flex gap-2">
              <input
                type="password"
                value={accountantPassword}
                onChange={(e) => setAccountantPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAccountant()}
                placeholder="Contraseña..."
                className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
                disabled={accountantLoading}
              />
              <button
                onClick={handleAddAccountant}
                disabled={accountantLoading || !accountantEmail.trim() || !accountantPassword.trim()}
                className="bg-indigo-600 text-white px-4 h-10 rounded-lg flex items-center justify-center gap-1.5 active:scale-90 disabled:opacity-50 text-xs font-bold"
              >
                {accountantLoading ? '...' : <><Plus className="w-4 h-4" /> Crear</>}
              </button>
            </div>
          </div>
          {accountantError && (
            <p className="text-xs text-red-500 font-semibold">{accountantError}</p>
          )}
          {accountants.length > 0 ? (
            <div className="space-y-2">
              {accountants.map((a) => (
                <div key={a.profileId} className="flex items-center justify-between bg-indigo-50 px-3 py-2.5 rounded-xl border border-indigo-100">
                  <div>
                    <span className="text-xs font-bold text-indigo-700">{a.email}</span>
                    <span className="ml-2 text-[9px] font-black bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded uppercase">Contadora</span>
                  </div>
                  <button
                    onClick={() => handleRemoveAccountant(a.profileId)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Quitar contadora"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">No hay contadoras asignadas</p>
          )}
        </div>
      </div>

      {/* 3. Monotributo */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-emerald-500" />
            Monotributo
          </h3>
          <p className="text-xs text-slate-500 mt-1">Escala AFIP de categorías y categoría actual. Lo usa la contadora en la sección Fiscal.</p>
        </div>
        <div className="p-4 space-y-4">
          {monotributoCats.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-emerald-700 mb-3">
                Todavía no cargaste la escala. Inicializala con los valores actuales de AFIP (vas a poder editar cada fila después).
              </p>
              <button
                onClick={handleSeedMono}
                disabled={monoSeeding}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {monoSeeding ? '...' : <><Plus className="w-3.5 h-3.5" /> Inicializar valores AFIP</>}
              </button>
            </div>
          ) : (
            <>
              {/* Selector de categoría actual */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Tu categoría actual
                </label>
                <div className="flex flex-wrap gap-2">
                  {monotributoCats.map((c) => {
                    const isActive = c.letter === currentMonoLetter;
                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => handleSetCurrentMono(c.letter)}
                        className={`w-10 h-10 rounded-xl font-black text-sm border-2 transition-all active:scale-90 ${
                          isActive
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        {c.letter}
                      </button>
                    );
                  })}
                </div>
                {currentMonoLetter && (
                  <p className="text-[10px] text-slate-500 mt-2">
                    La contadora va a usar la categoría <span className="font-black text-emerald-600">{currentMonoLetter}</span> como referencia para los cálculos.
                  </p>
                )}
              </div>

              {/* Tabla editable de categorías */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Escala completa
                </label>
                <p className="text-[10px] text-slate-500 mb-3">
                  Tocá el lápiz para editar el tope anual o el monto mensual de cualquier categoría. Actualizala cuando AFIP cambie los valores.
                </p>
                <div className="space-y-1.5">
                  {monotributoCats.map((c) => {
                    const isEditing = editingMonoId === c._id;
                    const isCurrent = c.letter === currentMonoLetter;
                    return (
                      <div
                        key={c._id}
                        className={`rounded-xl border-2 p-3 transition-colors ${
                          isCurrent
                            ? 'border-emerald-300 bg-emerald-50/40'
                            : 'border-slate-100 bg-slate-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                              isCurrent ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {c.letter}
                          </div>
                          {isEditing ? (
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                                  Tope anual
                                </label>
                                <input
                                  type="text"
                                  value={monoEditMaxBilling}
                                  onChange={(e) => setMonoEditMaxBilling(e.target.value)}
                                  placeholder="0"
                                  className="w-full h-9 px-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                                  Monto mensual
                                </label>
                                <input
                                  type="text"
                                  value={monoEditTotalGoods}
                                  onChange={(e) => setMonoEditTotalGoods(e.target.value)}
                                  placeholder="0"
                                  className="w-full h-9 px-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                  Tope anual
                                </p>
                                <p className="text-xs font-black text-slate-700 tracking-tighter">
                                  ${formatARS(c.maxBilling)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                  Monto mensual
                                </p>
                                <p className="text-xs font-black text-emerald-700 tracking-tighter">
                                  ${formatARS(c.totalGoods)}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEditMono}
                                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                  aria-label="Guardar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditMono}
                                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                  aria-label="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditMono(c)}
                                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                aria-label={`Editar categoría ${c.letter}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
