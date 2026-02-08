import React, { useState, useMemo } from 'react';
import { Plus, Minus, Search } from 'lucide-react';
import { CartItem, InventoryItem, ProductDraft } from '../../types';

interface ProductEntryProps {
  current: ProductDraft;
  onCurrentChange: (updates: Partial<ProductDraft>) => void;
  onAdd: (item: CartItem) => void;
  inventory: InventoryItem[];
  cartItems: CartItem[]; // Agregamos esta prop para el cálculo de stock temporal
}

const ProductEntry: React.FC<ProductEntryProps> = ({ 
  current, onCurrentChange, onAdd, inventory, cartItems 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!current.name || current.name.length < 2) return [];
    const term = current.name.toLowerCase();
    return inventory
      .filter(i => i.name.toLowerCase().includes(term))
      .slice(0, 5);
  }, [current.name, inventory]);

  const selectedInventoryItem = useMemo(() => {
    if (!current.inventoryId) return null;
    return inventory.find(i => i.id === current.inventoryId);
  }, [current.inventoryId, inventory]);

  // Lógica de Stock Temporal: Descuenta lo que ya está en el carrito
  const availableSizes = useMemo(() => {
    if (!selectedInventoryItem) return [];
    
    // Copiamos el stock real
    const stock = { ...(selectedInventoryItem.sizes || {}) };
    
    // Restamos lo que ya está en el carrito para este producto específico
    cartItems.forEach(cartItem => {
      if (cartItem.inventory_id === selectedInventoryItem.id && cartItem.size) {
        const currentQty = Number(stock[cartItem.size] || 0);
        stock[cartItem.size] = Math.max(0, currentQty - cartItem.quantity).toString();
      }
    });

    return Object.entries(stock)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([size, qty]) => ({ size, qty: Number(qty) }));
  }, [selectedInventoryItem, cartItems]);

  const handleSelectSuggestion = (item: InventoryItem) => {
    onCurrentChange({
      name: item.name,
      price: (item.selling_price || 0).toString(),
      inventoryId: item.id,
      size: '' // Forzamos a que elija talle de nuevo
    });
    setShowSuggestions(false);
  };

  const cleanNum = (val: string) => val.replace(/\D/g, '');

  const handleAdd = () => {
    if (!current.name || !current.price) return;
    
    // Validar que si es de inventario, haya seleccionado talle
    if (selectedInventoryItem && !current.size) {
      alert("Por favor, selecciona un talle disponible.");
      return;
    }

    // Validar stock disponible (considerando el carrito)
    if (selectedInventoryItem && current.size) {
      const sizeData = availableSizes.find(s => s.size === current.size);
      const stockDisponible = sizeData ? sizeData.qty : 0;
      
      if (parseInt(current.quantity) > stockDisponible) {
        alert(`Stock insuficiente. Solo quedan ${stockDisponible} unidades disponibles.`);
        return;
      }
    }
    
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

  const formatVisual = (num: string | number) => {
    if (!num) return '';
    const clean = num.toString().replace(/\D/g, '');
    return new Intl.NumberFormat('es-AR').format(parseInt(clean));
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl p-6 border border-slate-100 space-y-4 relative z-20">
      <div className="relative">
        <input 
          type="text" 
          placeholder="BUSCAR PRENDA..." 
          value={current.name} 
          onChange={(e) => {
            onCurrentChange({ name: e.target.value.toUpperCase(), inventoryId: '', size: '' });
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full h-16 px-6 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-base outline-none focus:border-primary transition-all placeholder:text-slate-300" 
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            {suggestions.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b border-slate-50 last:border-none flex justify-between items-center group"
              >
                <div className="flex flex-col">
                  <p className="font-bold text-slate-700 text-sm uppercase">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{(item.category || '').toUpperCase()}</p>
                </div>
                <span className="font-black text-primary bg-indigo-50 px-3 py-1 rounded-lg text-sm">
                  ${(item.selling_price || 0).toLocaleString('es-AR')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
          <input 
            type="text" 
            inputMode="decimal" 
            placeholder="Precio" 
            value={formatVisual(current.price)} 
            onChange={(e) => onCurrentChange({ price: cleanNum(e.target.value) })} 
            className="w-full h-16 pl-8 pr-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-lg outline-none focus:border-primary placeholder:text-slate-300" 
          />
        </div>

        <div className="flex items-center bg-slate-50 rounded-2xl border-2 border-slate-100 px-2 h-16">
          <button 
            type="button"
            onClick={() => onCurrentChange({ quantity: Math.max(1, parseInt(current.quantity) - 1).toString() })}
            className="p-3 text-slate-400 active:text-primary active:scale-125 transition-all"
          >
            <Minus className="w-6 h-6" />
          </button>
          <input 
            type="number" 
            value={current.quantity} 
            onChange={(e) => onCurrentChange({ quantity: e.target.value })}
            className="w-full text-center bg-transparent font-black text-xl outline-none"
          />
          <button 
            type="button"
            onClick={() => onCurrentChange({ quantity: (parseInt(current.quantity) + 1).toString() })}
            className="p-3 text-slate-400 active:text-primary active:scale-125 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Talles: Solo se muestra si hay un producto seleccionado */}
      {selectedInventoryItem && (
        <div className="bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Talles Disponibles</p>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map(({ size, qty }) => (
              <button
                key={size}
                type="button"
                onClick={() => onCurrentChange({ size })}
                className={`h-14 min-w-[70px] flex items-center justify-center rounded-2xl border-2 font-black transition-all shadow-sm ${
                  current.size === size 
                    ? 'border-primary bg-primary text-white scale-105 shadow-primary/20' 
                    : 'border-white bg-white text-slate-400 hover:border-slate-200'
                }`}
              >
                <span className="text-sm">{size}</span>
                <span className="mx-1 opacity-20 text-xs">|</span>
                <span className="text-sm">{qty}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={handleAdd} 
        disabled={!current.name || !current.price || (selectedInventoryItem && !current.size)} 
        className="w-full h-16 bg-primary text-white font-black rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:opacity-50 shadow-lg shadow-primary/20 uppercase tracking-widest"
      >
        <Plus className="w-6 h-6" /> AGREGAR AL CARRITO
      </button>
    </div>
  );
};

export default ProductEntry;