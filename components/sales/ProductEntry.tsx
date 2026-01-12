import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { CartItem, InventoryItem, ProductDraft } from '../../types';

interface ProductEntryProps {
  current: ProductDraft;
  onCurrentChange: (updates: Partial<ProductDraft>) => void;
  onAdd: (item: CartItem) => void;
  inventory: InventoryItem[];
}

const ProductEntry: React.FC<ProductEntryProps> = ({ current, onCurrentChange, onAdd, inventory }) => {
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
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-4 border border-slate-100 space-y-3">
      <input 
        type="text" 
        placeholder="¿QUÉ LLEVA LA CLIENTA?..." 
        value={current.name} 
        onChange={(e) => onCurrentChange({ name: e.target.value.toUpperCase() })} 
        className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-base outline-none focus:border-primary transition-all" 
      />
      
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