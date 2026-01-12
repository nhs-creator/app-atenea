import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { CartItem } from '../../types';

interface CartDisplayProps {
  items: CartItem[];
  itemFinalPrices: Record<string, number>;
  onRemove: (id: string) => void;
  onEdit: (item: CartItem) => void;
}

const CartDisplay: React.FC<CartDisplayProps> = ({ items, itemFinalPrices, onRemove, onEdit }) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Productos en Carrito</h3>
      {items.map(item => (
        <div 
          key={item.id} 
          className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs text-slate-700 truncate uppercase tracking-tighter">
              {item.quantity > 1 && <span className="text-primary mr-1">{item.quantity}x</span>}
              {item.product}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <p className="font-black text-primary text-sm mr-2">
              ${(itemFinalPrices[item.id] * item.quantity).toLocaleString()}
            </p>
            
            <button 
              onClick={() => onEdit(item)} 
              className="p-2 text-slate-400 active:bg-slate-100 rounded-xl transition-colors"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => onRemove(item.id)} 
              className="p-2 text-rose-400 active:bg-rose-50 rounded-xl transition-colors"
              title="Quitar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CartDisplay;