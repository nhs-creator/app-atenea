import React, { useState, useMemo } from 'react';
import { Plus, Minus, Search } from 'lucide-react';
import { CartItem, InventoryItem, ProductDraft } from '../../types';

interface ProductEntryProps {
  current: ProductDraft;
  onCurrentChange: (updates: Partial<ProductDraft>) => void;
  onAdd: (item: CartItem) => void;
  inventory: InventoryItem[];
}

const ProductEntry: React.FC<ProductEntryProps> = ({ current, onCurrentChange, onAdd, inventory }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!current.name || current.name.length < 2) return [];
    const term = current.name.toLowerCase();
    return inventory
      .filter(i => i.name.toLowerCase().includes(term))
      .slice(0, 5);
  }, [current.name, inventory]);

  const handleSelectSuggestion = (item: InventoryItem) => {
    onCurrentChange({
      name: item.name,
      price: (item.selling_price || 0).toString(),
      inventoryId: item.id
    });
    setShowSuggestions(false);
  };

  const formatVisual = (num: string | number) => {
    if (!num) return '';
    const clean = num.toString().replace(/\D/g, '');
    return new Intl.NumberFormat('es-AR').format(parseInt(clean));
  };

  const cleanNum = (val: string) => val.replace(/\D/g, '');

  const handleAdd = () => {
    if (!current.name || !current.price) return;
    
    // Solo enviamos el item. La limpieza la hará el padre en un solo paquete.
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      product: current.name.toUpperCase().trim(),
      quantity: parseInt(current.quantity),
      listPrice: parseInt(cleanNum(current.price)),
      finalPrice: parseInt(cleanNum(current.price)),
      size: current.size,
      inventory_id: current.inventoryId || undefined,
      cost_price: inventory.find(i => i.id === current.inventoryId)?.cost_price || 0
    });
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-4 border border-slate-100 space-y-3 relative z-20">
      <div className="relative">
        <input 
          type="text" 
          placeholder="¿QUÉ LLEVA LA CLIENTA?..." 
          value={current.name} 
          onChange={(e) => {
            onCurrentChange({ name: e.target.value.toUpperCase() });
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-base outline-none focus:border-primary transition-all" 
        />
        
        {/* Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            {suggestions.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-5 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none flex justify-between items-center group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:text-primary group-hover:bg-indigo-50 transition-colors">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm uppercase">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{(item.category || '').toUpperCase()}</p>
                  </div>
                </div>
                <span className="font-black text-primary bg-indigo-50 px-3 py-1 rounded-lg text-sm group-hover:bg-primary group-hover:text-white transition-colors">
                  ${(item.selling_price || 0).toLocaleString('es-AR')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
          <input 
            type="text" 
            inputMode="decimal" 
            placeholder="Precio" 
            value={formatVisual(current.price)} 
            onChange={(e) => onCurrentChange({ price: cleanNum(e.target.value) })} 
            className="w-full h-14 pl-8 pr-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-lg outline-none focus:border-primary" 
          />
        </div>

        <div className="flex items-center bg-slate-50 rounded-2xl border-2 border-slate-100 px-2 h-14">
          <button 
            onClick={() => onCurrentChange({ quantity: Math.max(1, parseInt(current.quantity) - 1).toString() })}
            className="p-2 text-slate-400 active:text-primary active:scale-125 transition-all"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input 
            type="number" 
            value={current.quantity} 
            onChange={(e) => onCurrentChange({ quantity: e.target.value })}
            className="w-full text-center bg-transparent font-black text-lg outline-none"
          />
          <button 
            onClick={() => onCurrentChange({ quantity: (parseInt(current.quantity) + 1).toString() })}
            className="p-2 text-slate-400 active:text-primary active:scale-125 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <button 
        onClick={handleAdd} 
        disabled={!current.name || !current.price} 
        className="w-full h-14 bg-primary text-white font-black rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale"
      >
        <Plus className="w-6 h-6" /> AGREGAR AL CARRITO
      </button>
    </div>
  );
};

export default ProductEntry;