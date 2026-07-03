import React, { useState } from 'react';
import { AppConfig } from '../types';
import { ChevronLeft } from 'lucide-react';
import { DEFAULT_SIZE_SYSTEMS, DEFAULT_CATEGORY_SIZE_MAP, DEFAULT_OPEN_DAYS } from '../constants';
import SettingsMenu, { SETTINGS_SECTIONS, SettingsSectionKey } from './settings/SettingsMenu';
import LocalHoursSection from './settings/LocalHoursSection';
import AccountantsSection from './settings/AccountantsSection';
import MonotributoSection from './settings/MonotributoSection';
import AfipSection from './settings/AfipSection';
import CatalogSection from './settings/CatalogSection';
import SizesSection from './settings/SizesSection';
import AppUpdateFooter from './settings/AppUpdateFooter';

interface SettingsViewProps {
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
  onSyncInventory?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ config, onSaveConfig }) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionKey | null>(null);

  // --- Estado del "config" (categorías/subcategorías/materiales/talles/días) ---
  // Se guarda como un solo objeto (handleSave), compartido entre las secciones
  // Días/Catálogo/Talles — por eso vive acá y no en cada subcomponente.
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

  if (!activeSection) {
    return (
      <div className="space-y-4 pb-10">
        <h2 className="text-xl font-bold text-slate-800 px-1">Ajustes</h2>
        <SettingsMenu onSelect={setActiveSection} />
        <AppUpdateFooter />
      </div>
    );
  }

  const meta = SETTINGS_SECTIONS.find(s => s.key === activeSection)!;

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => setActiveSection(null)}
          className="min-w-[36px] min-h-[36px] -ml-1.5 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Volver a Ajustes"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-800">{meta.title}</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {activeSection === 'hours' && (
          <LocalHoursSection openDays={openDays} toggleOpenDay={toggleOpenDay} onSave={handleSave} />
        )}
        {activeSection === 'accountants' && <AccountantsSection />}
        {activeSection === 'monotributo' && <MonotributoSection />}
        {activeSection === 'afip' && <AfipSection />}
        {activeSection === 'catalog' && (
          <CatalogSection
            categories={categories}
            subcategories={subcategories}
            materials={materials}
            newCat={newCat}
            setNewCat={setNewCat}
            addCategory={addCategory}
            removeCategory={removeCategory}
            selectedCatForSub={selectedCatForSub}
            setSelectedCatForSub={setSelectedCatForSub}
            newSub={newSub}
            setNewSub={setNewSub}
            addSubcategory={addSubcategory}
            removeSubcategory={removeSubcategory}
            newMat={newMat}
            setNewMat={setNewMat}
            addMaterial={addMaterial}
            removeMaterial={removeMaterial}
            onSave={handleSave}
          />
        )}
        {activeSection === 'sizes' && (
          <SizesSection
            categories={categories}
            sizeSystems={sizeSystems}
            categorySizeMap={categorySizeMap}
            newSizeSystemName={newSizeSystemName}
            setNewSizeSystemName={setNewSizeSystemName}
            addSizeSystem={addSizeSystem}
            removeSizeSystem={removeSizeSystem}
            selectedSizeSystem={selectedSizeSystem}
            setSelectedSizeSystem={setSelectedSizeSystem}
            newSizeLabel={newSizeLabel}
            setNewSizeLabel={setNewSizeLabel}
            addSizeToSystem={addSizeToSystem}
            removeSizeFromSystem={removeSizeFromSystem}
            setCategorySizeSystem={setCategorySizeSystem}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
};

export default SettingsView;
