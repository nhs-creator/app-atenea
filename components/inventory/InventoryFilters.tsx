import React from 'react';
import { Search, Filter } from 'lucide-react';

interface InventoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedSubcategory: string;
  onSubcategoryChange: (value: string) => void;
  selectedMaterial: string;
  onMaterialChange: (value: string) => void;
  stockLevel: 'all' | 'out' | 'low' | 'normal' | 'high';
  onStockLevelChange: (value: 'all' | 'out' | 'low' | 'normal' | 'high') => void;
  categories: string[];
  subcategories: string[];
  materials: string[];
  totalResults: number;
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSubcategory,
  onSubcategoryChange,
  selectedMaterial,
  onMaterialChange,
  stockLevel,
  onStockLevelChange,
  categories,
  subcategories,
  materials,
  totalResults
}) => {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => onSearchChange(e.target.value)} 
          placeholder="Buscar por nombre o subcategoría..." 
          className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm focus:border-primary outline-none font-bold text-slate-700" 
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Filtros Avanzados
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Categoría
            </label>
            <select 
              value={selectedCategory} 
              onChange={(e) => onCategoryChange(e.target.value)} 
              className="w-full h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black uppercase focus:border-primary outline-none transition-colors"
            >
              <option value="">TODAS</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Subcategoría
            </label>
            <select 
              value={selectedSubcategory} 
              onChange={(e) => onSubcategoryChange(e.target.value)} 
              className="w-full h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black uppercase focus:border-primary outline-none transition-colors"
              disabled={!selectedCategory}
            >
              <option value="">TODAS</option>
              {subcategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Material Filter */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Material
            </label>
            <select 
              value={selectedMaterial} 
              onChange={(e) => onMaterialChange(e.target.value)} 
              className="w-full h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black uppercase focus:border-primary outline-none transition-colors"
            >
              <option value="">TODOS</option>
              {materials.map(mat => (
                <option key={mat} value={mat}>{mat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock Level Filter */}
        <div className="mt-4">
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">
            Nivel de Stock
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onStockLevelChange('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                stockLevel === 'all'
                  ? 'bg-slate-100 text-slate-700 border-2 border-slate-300 shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-500 border-2 border-transparent hover:border-slate-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => onStockLevelChange('out')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                stockLevel === 'out'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300 shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-500 border-2 border-transparent hover:border-slate-300'
              }`}
            >
              Sin Stock
            </button>
            <button
              onClick={() => onStockLevelChange('low')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                stockLevel === 'low'
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-300 shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-500 border-2 border-transparent hover:border-slate-300'
              }`}
            >
              Bajo (≤5)
            </button>
            <button
              onClick={() => onStockLevelChange('normal')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                stockLevel === 'normal'
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-500 border-2 border-transparent hover:border-slate-300'
              }`}
            >
              Normal (6-20)
            </button>
            <button
              onClick={() => onStockLevelChange('high')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                stockLevel === 'high'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-500 border-2 border-transparent hover:border-slate-300'
              }`}
            >
              Alto (&gt;20)
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-center">
        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-full">
          {totalResults} {totalResults === 1 ? 'producto encontrado' : 'productos encontrados'}
        </span>
      </div>
    </div>
  );
};

export default InventoryFilters;
