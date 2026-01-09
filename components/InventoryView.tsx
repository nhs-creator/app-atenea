import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, InventoryFormData, AppConfig } from '../types';
import { SIZE_SYSTEMS, CATEGORY_SIZE_MAP } from '../constants';
import { Plus, Search, Trash2, Package, Minus, Save, X, ChevronDown, Ruler, Edit2 } from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  config: AppConfig;
  onAdd: (data: InventoryFormData) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

const InventoryCard = React.memo(({ 
  item, 
  onEdit,
  onDeleteRequest, 
  deleteConfirmId, 
  setDeleteConfirmId 
}: { 
  item: InventoryItem, 
  onStockUpdate: (item: InventoryItem) => void,
  onEdit: (item: InventoryItem) => void,
  onDeleteRequest: (id: string) => void,
  deleteConfirmId: string | null,
  setDeleteConfirmId: (id: string | null) => void
}) => {
  
  const realStock = useMemo(() => {
    return Object.values(item.sizes || {}).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
  }, [item.sizes]);

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'text-red-600 bg-red-50 border-red-200', dot: 'bg-red-500' };
    if (stock <= 2) return { color: 'text-rose-600 bg-rose-50 border-rose-200', dot: 'bg-rose-500' };
    if (stock <= 5) return { color: 'text-amber-600 bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
    return { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  };

  const status = getStockStatus(realStock);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 relative overflow-hidden transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-bold text-slate-800 text-base leading-tight truncate mb-1.5">{item.name}</h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-slate-200">{item.category}</span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-indigo-100">{item.subcategory}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className="text-sm font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            ${item.selling_price.toLocaleString('es-AR')}
          </span>
          <div className="flex gap-1">
            <button onClick={() => onEdit(item)} className="text-slate-400 hover:text-primary p-1.5 bg-slate-50 rounded-lg transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setDeleteConfirmId(item.id)} className="text-slate-300 hover:text-red-500 p-1.5 transition-colors">
               <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px]">
        {Object.entries(item.sizes || {})
          .filter(([_, qty]) => Number(qty) !== 0)
          .map(([size, qty]) => (
            <div key={size} className="flex items-center rounded-lg border border-slate-200 bg-white text-[10px] font-bold overflow-hidden shadow-sm">
              <span className="bg-slate-50 px-2 py-1 text-slate-400 border-r border-slate-100">{size}</span>
              <span className="px-2 py-1 text-slate-700">{qty}</span>
            </div>
          ))}
        {realStock === 0 && <span className="text-[10px] font-bold text-red-400 italic">Sin stock</span>}
      </div>

      <div className={`flex items-center justify-between rounded-xl p-3 border ${status.color}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${status.dot}`}></div>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Stock Total</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black leading-none">{realStock}</span>
        </div>
      </div>
      
      {deleteConfirmId === item.id && (
        <button onClick={() => onDeleteRequest(item.id)} className="w-full mt-3 bg-red-600 text-white py-2.5 rounded-xl text-xs font-black uppercase animate-in zoom-in">Confirmar Eliminación</button>
      )}
    </div>
  );
});

const InventoryView: React.FC<InventoryViewProps> = ({ inventory = [], config, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(25);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearch(searchTerm); setVisibleCount(25); }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const categories = config.categories || [];
  const subcategoriesMap = config.subcategories || {};

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '', category: categories[0] || '', subcategory: '', material: '', sizes: {}, costPrice: '', sellingPrice: ''
  });

  const activeSizeSystem = useMemo(() => {
    const systemKey = CATEGORY_SIZE_MAP[formData.category] || 'UNICO';
    return SIZE_SYSTEMS[systemKey];
  }, [formData.category]);

  useEffect(() => {
    if (!editingId) {
      const newSizes: Record<string, string> = {};
      activeSizeSystem.forEach(s => newSizes[s] = '');
      setFormData(f => ({ ...f, sizes: newSizes }));
    }
  }, [activeSizeSystem, editingId]);

  const handleEdit = (item: InventoryItem) => {
    // Solución al error de tipado: mapeo manual y seguro
    const mappedSizes: Record<string, string> = {};
    Object.entries(item.sizes || {}).forEach(([s, q]) => {
      mappedSizes[s] = String(q);
    });

    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      material: item.material || '',
      sizes: mappedSizes,
      costPrice: String(item.cost_price),
      sellingPrice: String(item.selling_price)
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      const sizesNum: Record<string, number> = {};
      Object.entries(formData.sizes).forEach(([s, q]) => sizesNum[s] = parseInt(q as string) || 0);
      
      onUpdate({
        id: editingId,
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory,
        material: formData.material,
        sizes: sizesNum,
        cost_price: parseFloat(formData.costPrice) || 0,
        selling_price: parseFloat(formData.sellingPrice) || 0,
        last_updated: new Date().toISOString(),
        synced: false
      });
    } else {
      onAdd(formData);
    }

    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ name: '', category: categories[0], subcategory: '', material: '', sizes: {}, costPrice: '', sellingPrice: '' });
  };

  const filteredInventory = useMemo(() => {
    const lowSearch = debouncedSearch.toLowerCase();
    return inventory.filter(item => 
      item.name.toLowerCase().includes(lowSearch) ||
      (item.subcategory && item.subcategory.toLowerCase().includes(lowSearch))
    ).sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
  }, [inventory, debouncedSearch]);

  const displayedItems = useMemo(() => filteredInventory.slice(0, visibleCount), [filteredInventory, visibleCount]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inventario</h2>
          <p className="text-xs text-slate-500">{filteredInventory.length} productos</p>
        </div>
        <button 
          onClick={() => { if(showForm) resetForm(); else setShowForm(true); }}
          className={`p-2.5 rounded-xl shadow-md transition-all ${showForm ? 'bg-slate-200 text-slate-600' : 'bg-primary text-white'}`}
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl border border-teal-100 p-5 animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-teal-900 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" /> {editingId ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nombre</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Remera Algodon" className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:border-primary outline-none" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Categoría</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value, subcategory: ''})} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold">
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Subcategoría</label>
                <select value={formData.subcategory} onChange={(e) => setFormData({...formData, subcategory: e.target.value})} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold" required>
                  <option value="">Seleccionar...</option>
                  {(subcategoriesMap[formData.category] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {/* CORRECCIÓN TAILWIND: Se quitó 'block' porque ya es 'flex' */}
              <label className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                <Ruler className="w-3 h-3" /> Distribución de Talles
              </label>
              <div className="grid grid-cols-4 gap-2">
                {activeSizeSystem.map(size => (
                  <div key={size} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 text-center">{size}</span>
                    <input type="text" inputMode="numeric" value={formData.sizes[size] || ''} onChange={(e) => setFormData({ ...formData, sizes: { ...formData.sizes, [size]: e.target.value.replace(/\D/g, '') } })} placeholder="0" className="w-full h-9 bg-white border border-slate-200 rounded-lg text-center text-xs font-bold focus:border-primary outline-none" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Precio Costo</label>
                <input type="text" inputMode="decimal" value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: e.target.value.replace(/[^\d.]/g, '')})} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Precio Venta</label>
                <input type="text" inputMode="decimal" value={formData.sellingPrice} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value.replace(/[^\d.]/g, '')})} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-primary" required />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
               {editingId && <button type="button" onClick={resetForm} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl active:scale-95 transition-all">Cancelar</button>}
               <button type="submit" className="flex-[2] bg-primary text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> {editingId ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar prenda..." className="w-full pl-10 pr-4 h-12 rounded-2xl border border-slate-200 bg-white shadow-sm focus:border-primary outline-none font-medium text-slate-700" />
      </div>

      <div className="space-y-3">
        {displayedItems.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
             <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
             No hay productos
          </div>
        ) : (
          displayedItems.map(item => (
            <InventoryCard 
              key={item.id} 
              item={item} 
              onStockUpdate={() => {}} 
              onEdit={handleEdit}
              onDeleteRequest={onDelete}
              deleteConfirmId={deleteConfirmId}
              setDeleteConfirmId={setDeleteConfirmId}
            />
          ))
        )}
        {filteredInventory.length > visibleCount && (
          <button onClick={() => setVisibleCount(v => v + 25)} className="w-full py-4 text-primary font-bold text-xs uppercase bg-teal-50 rounded-2xl">
            Ver más productos <ChevronDown className="w-4 h-4 inline" />
          </button>
        )}
      </div>
    </div>
  );
};

export default InventoryView;