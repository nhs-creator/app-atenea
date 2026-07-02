import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import OptionPicker from './OptionPicker';

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
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = Boolean(selectedCategory || selectedSubcategory || selectedMaterial || stockLevel !== 'all');

  return (
    <div className="space-y-4">
      {/* Search Bar + botón de filtro, una sola línea */}
      <div className="flex gap-2">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre o subcategoría..."
            className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm focus:border-primary outline-none font-bold text-slate-700"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`relative w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl border shadow-sm transition-all active:scale-95 ${
            showFilters ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-500'
          }`}
          aria-label="Filtros avanzados"
        >
          <Filter className="w-5 h-5" />
          {hasActiveFilters && !showFilters && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
        <div className="space-y-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Categoría
            </label>
            <OptionPicker
              variant="chips"
              options={categories}
              selected={selectedCategory}
              allLabel="TODAS"
              onSelect={onCategoryChange}
            />
          </div>

          {/* Subcategory Filter */}
          {selectedCategory && (
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Subcategoría
              </label>
              <OptionPicker
                variant="chips"
                options={subcategories}
                selected={selectedSubcategory}
                allLabel="TODAS"
                onSelect={onSubcategoryChange}
              />
            </div>
          )}

          {/* Material Filter */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Material
            </label>
            <OptionPicker
              variant="chips"
              options={materials}
              selected={selectedMaterial}
              allLabel="TODOS"
              onSelect={onMaterialChange}
            />
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
      )}

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
