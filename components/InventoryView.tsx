import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, InventoryFormData, AppConfig } from '../types';
import { DEFAULT_SIZE_SYSTEMS, DEFAULT_CATEGORY_SIZE_MAP } from '../constants';
import { Plus, Trash2, Package, Save, X, Ruler, Edit2, History, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { InventoryMovements } from './inventory/InventoryMovements';
import InventoryFilters from './inventory/InventoryFilters';
import InventoryReporte from './inventory/InventoryReporte';

interface InventoryViewProps {
  inventory: InventoryItem[];
  config: AppConfig;
  onAdd: (data: InventoryFormData) => void | Promise<unknown>;
  onUpdate: (item: InventoryItem) => void | Promise<unknown>;
  onDelete: (id: string) => void | Promise<unknown>;
}

const InventoryCard = React.memo(({ 
  item, 
  onEdit,
  onDeleteRequest, 
  deleteConfirmId, 
  setDeleteConfirmId,
  onShowHistory
}: { 
  item: InventoryItem, 
  onEdit: (item: InventoryItem) => void,
  onDeleteRequest: (id: string) => void,
  deleteConfirmId: string | null,
  setDeleteConfirmId: (id: string | null) => void,
  onShowHistory: (id: string, name: string) => void
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

  const getQtyColor = (qty: number) => {
    if (qty <= 1) return 'text-red-600 bg-red-50 border-red-100';
    if (qty <= 3) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  const status = getStockStatus(realStock);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 relative overflow-hidden transition-all hover:shadow-md">
      {/* Header: Name and Main Price */}
      <div className="flex justify-between items-start mb-3 gap-4">
        <div className="flex-1">
          <h4 className="font-black text-slate-800 text-lg leading-tight uppercase mb-2">
            {item.name}
          </h4>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border border-indigo-100">{(item.category || '').toUpperCase()}</span>
            <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border border-slate-200">{(item.subcategory || '').toUpperCase()}</span>
            {item.material && <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border border-amber-100">{item.material.toUpperCase()}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xl font-black text-slate-900 leading-none tracking-tighter">
            ${item.selling_price.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Sizes Section: Cleaned (only > 0) */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(item.sizes || {})
          .filter(([_, qty]) => Number(qty) > 0)
          .map(([size, qty]) => (
            <div key={size} className={`flex items-center rounded-xl border text-[11px] font-black overflow-hidden shadow-sm transition-colors ${getQtyColor(Number(qty))}`}>
              <span className="px-3 py-1.5 border-r border-current/10 opacity-70 bg-white/40">{size}</span>
              <span className="px-3 py-1.5">{qty}</span>
            </div>
          ))}
        {realStock === 0 && <span className="text-xs font-bold text-red-400 italic">Sin existencias</span>}
      </div>

      {/* Footer bar: Integrated Total Stock + Actions */}
      <div className="flex items-stretch gap-2 h-14">
        <div className={`flex-1 flex items-center justify-between rounded-2xl px-4 border transition-colors ${status.color}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${status.dot}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Stock Total</span>
          </div>
          <span className="text-2xl font-black leading-none">{realStock}</span>
        </div>
        
        {/* Compact Actions Area */}
        <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          <button 
            onClick={() => onShowHistory(item.id, item.name)} 
            className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all active:scale-90"
            aria-label="Historial"
            title="Ver historial de movimientos"
          >
            <History className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onEdit(item)} 
            className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white rounded-xl transition-all active:scale-90"
            aria-label="Editar"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setDeleteConfirmId(item.id)} 
            className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all active:scale-90"
            aria-label="Eliminar"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Confirmation Block */}
      {deleteConfirmId === item.id && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3 animate-in zoom-in-95 duration-200">
          <p className="text-xs font-bold text-red-800 text-center">¿Eliminar <strong>"{item.name}"</strong>? Esta acción no se puede deshacer.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteConfirmId(null)} className="flex-1 h-12 rounded-xl text-xs font-black uppercase bg-slate-200 text-slate-700 active:scale-[0.98]">Cancelar</button>
            <button type="button" onClick={() => { onDeleteRequest(item.id); setDeleteConfirmId(null); }} className="flex-1 h-12 rounded-xl text-xs font-black uppercase bg-red-600 text-white active:scale-[0.98]">Eliminar</button>
          </div>
        </div>
      )}
    </div>
  );
});

const InventoryView: React.FC<InventoryViewProps> = ({ inventory = [], config, onAdd, onUpdate, onDelete }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'stock' | 'reporte'>('stock');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [stockLevel, setStockLevel] = useState<'all' | 'out' | 'low' | 'normal' | 'high'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  // UI state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showMovements, setShowMovements] = useState<{id: string, name: string} | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => { 
      setDebouncedSearch(searchTerm); 
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, selectedMaterial, stockLevel]);

  const categories = config.categories || [];
  const subcategoriesMap = config.subcategories || {};
  const materials = config.materials || [];

  // Get available subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    return subcategoriesMap[selectedCategory] || [];
  }, [selectedCategory, subcategoriesMap]);

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '', category: categories[0] || '', subcategory: '', material: '', sizes: {}, costPrice: '', sellingPrice: '', minStock: '', sku: '', barcode: ''
  });

  const activeSizeSystem = useMemo(() => {
    const sizeSystems = (config.sizeSystems && Object.keys(config.sizeSystems).length > 0) ? config.sizeSystems : DEFAULT_SIZE_SYSTEMS;
    const categorySizeMap = (config.categorySizeMap && Object.keys(config.categorySizeMap).length > 0) ? config.categorySizeMap : DEFAULT_CATEGORY_SIZE_MAP;
    const categoryKey = (formData.category || '').toUpperCase();
    const systemKey = categorySizeMap[categoryKey] || 'UNICO';
    const sizes = sizeSystems[systemKey];
    return sizes && sizes.length > 0 ? sizes : (DEFAULT_SIZE_SYSTEMS.LETRAS || ['U']);
  }, [formData.category, config.sizeSystems, config.categorySizeMap]);

  useEffect(() => {
    setFormData(f => {
      const newSizes: Record<string, string> = {};
      activeSizeSystem.forEach(s => {
        const currentVal = f.sizes?.[s];
        newSizes[s] = typeof currentVal === 'number' ? String(currentVal) : (currentVal ?? '');
      });
      return { ...f, sizes: newSizes };
    });
  }, [formData.category, activeSizeSystem]);

  const handleEdit = (item: InventoryItem) => {
    const mappedSizes: Record<string, string> = {};
    Object.entries(item.sizes || {}).forEach(([s, q]) => {
      mappedSizes[s] = String(q);
    });

    setEditingId(item.id);
    setFormData({
      name: (item.name || '').toUpperCase(),
      category: (item.category || '').toUpperCase(),
      subcategory: (item.subcategory || '').toUpperCase(),
      material: (item.material || '').toUpperCase(),
      sizes: mappedSizes,
      costPrice: String(item.cost_price || ''),
      sellingPrice: String(item.selling_price || ''),
      minStock: String(item.min_stock || 0),
      sku: item.sku || '',
      barcode: item.barcode || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      const sizesNum: Record<string, number> = {};
      Object.entries(formData.sizes || {}).forEach(([s, q]) => sizesNum[s] = parseInt(String(q), 10) || 0);

      await onUpdate({
        id: editingId,
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory,
        material: formData.material,
        sizes: sizesNum,
        cost_price: parseFloat(formData.costPrice) || 0,
        selling_price: parseFloat(formData.sellingPrice) || 0,
        min_stock: parseInt(formData.minStock, 10) || 0,
        // updated_at se actualiza automáticamente via trigger
      } as any);
    } else {
      const dataToAdd: InventoryFormData = {
        ...formData,
        sizes: Object.fromEntries(
          Object.entries(formData.sizes || {}).map(([s, q]) => [s, parseInt(String(q), 10) || 0])
        ) as Record<string, number>
      };
      await onAdd(dataToAdd);
    }

    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ name: '', category: categories[0] || '', subcategory: '', material: '', sizes: {}, costPrice: '', sellingPrice: '', minStock: '' });
  };

  const filteredInventory = useMemo(() => {
    const lowSearch = debouncedSearch.toLowerCase();
    return inventory.filter(item => {
      // Text search
      const matchesSearch = !debouncedSearch || 
        item.name.toLowerCase().includes(lowSearch) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(lowSearch));
      
      // Category filter
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      
      // Subcategory filter
      const matchesSubcategory = !selectedSubcategory || item.subcategory === selectedSubcategory;
      
      // Material filter
      const matchesMaterial = !selectedMaterial || item.material === selectedMaterial;
      
      // Stock level filter
      const matchesStockLevel = (() => {
        if (stockLevel === 'all') return true;
        if (stockLevel === 'out') return item.stock_total === 0;
        if (stockLevel === 'low') return item.stock_total > 0 && item.stock_total <= 5;
        if (stockLevel === 'normal') return item.stock_total > 5 && item.stock_total <= 20;
        if (stockLevel === 'high') return item.stock_total > 20;
        return true;
      })();
      
      return matchesSearch && matchesCategory && matchesSubcategory && matchesMaterial && matchesStockLevel;
    }).sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [inventory, debouncedSearch, selectedCategory, selectedSubcategory, selectedMaterial, stockLevel]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventory, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md pt-2 pb-2">
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
          <button 
            onClick={() => setActiveTab('stock')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === 'stock' ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> STOCK
          </button>
          <button 
            onClick={() => setActiveTab('reporte')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === 'reporte' ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> REPORTE STOCK
          </button>
        </div>
      </div>

      {/* Form Modal (overlay, shown regardless of tab) */}
      {showForm && (
        <div className="bg-white rounded-3xl shadow-xl border border-teal-100 p-6 animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-teal-900 mb-5 flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" /> {editingId ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})} 
                placeholder="Ej: REMERA ALGODON" 
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold focus:border-primary outline-none uppercase transition-all" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Categoría</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value, subcategory: ''})} className="w-full h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black uppercase">
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Subcategoría</label>
                <select value={formData.subcategory} onChange={(e) => setFormData({...formData, subcategory: e.target.value})} className="w-full h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black uppercase" required>
                  <option value="">Seleccionar...</option>
                  {(subcategoriesMap[formData.category] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Material</label>
              <select value={formData.material} onChange={(e) => setFormData({...formData, material: e.target.value})} className="w-full h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black uppercase">
                <option value="">Sin material</option>
                {materials.map(mat => <option key={mat} value={mat}>{mat}</option>)}
              </select>
            </div>

            {/* SKU/Barcode fields hidden for future QR implementation
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">SKU (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.sku || ''} 
                  onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})} 
                  placeholder="Ej: SKU-001" 
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-mono uppercase focus:border-primary outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Código de Barras (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.barcode || ''} 
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})} 
                  placeholder="1234567890123" 
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-mono focus:border-primary outline-none transition-all" 
                />
              </div>
            </div>
            */}

            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5" /> Distribución de Talles
              </label>
              <div className="grid grid-cols-4 gap-3">
                {activeSizeSystem.map(size => (
                  <div key={size} className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-slate-500 text-center">{size}</span>
                    <input type="text" inputMode="numeric" value={formData.sizes[size] || ''} onChange={(e) => setFormData({ ...formData, sizes: { ...formData.sizes, [size]: e.target.value.replace(/\D/g, '') } })} placeholder="0" className="w-full h-10 bg-white border border-slate-200 rounded-xl text-center text-sm font-black focus:border-primary outline-none transition-all shadow-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Precio Costo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={formData.costPrice ? parseFloat(formData.costPrice).toLocaleString('es-AR') : ''} 
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                      setFormData({...formData, costPrice: rawValue});
                    }} 
                    className="w-full h-12 pl-7 pr-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Precio Venta</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={formData.sellingPrice ? parseFloat(formData.sellingPrice).toLocaleString('es-AR') : ''} 
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                      setFormData({...formData, sellingPrice: rawValue});
                    }} 
                    className="w-full h-12 pl-7 pr-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-primary" 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
               {editingId && <button type="button" onClick={resetForm} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest">Cancelar</button>}
               <button type="submit" className="flex-[2] bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                <Save className="w-5 h-5" /> {editingId ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'stock' ? (
        <div className="space-y-6 pb-24 animate-in fade-in duration-300">
          {/* Filters Component */}
          <InventoryFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={(val) => {
              setSelectedCategory(val);
              setSelectedSubcategory(''); // Reset subcategory when category changes
            }}
            selectedSubcategory={selectedSubcategory}
            onSubcategoryChange={setSelectedSubcategory}
            selectedMaterial={selectedMaterial}
            onMaterialChange={setSelectedMaterial}
            stockLevel={stockLevel}
            onStockLevelChange={setStockLevel}
            categories={categories}
            subcategories={availableSubcategories}
            materials={materials}
            totalResults={filteredInventory.length}
          />

          {/* Product List */}
          <div className="space-y-4">
            {paginatedItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-200">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">
                  {filteredInventory.length === 0 ? 'No hay productos que coincidan con los filtros' : 'No hay productos'}
                </p>
              </div>
            ) : (
              paginatedItems.map(item => (
                <InventoryCard 
                  key={item.id} 
                  item={item} 
                  onEdit={handleEdit}
                  onDeleteRequest={onDelete}
                  deleteConfirmId={deleteConfirmId}
                  setDeleteConfirmId={setDeleteConfirmId}
                  onShowHistory={(id, name) => setShowMovements({id, name})}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-600">
                  Página <span className="text-primary text-lg">{currentPage}</span> de {totalPages}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  ({filteredInventory.length} {filteredInventory.length === 1 ? 'producto' : 'productos'})
                </span>
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <InventoryReporte inventory={inventory} />
      )}

      {/* Inventory Movements Modal */}
      {showMovements && (
        <InventoryMovements
          inventoryId={showMovements.id}
          inventoryName={showMovements.name}
          onClose={() => setShowMovements(null)}
        />
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-primary text-white rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center z-30"
        aria-label="Agregar producto"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
};

export default InventoryView;