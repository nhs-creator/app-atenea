import React from 'react';
import { Calculator, Send, CheckCircle2 } from 'lucide-react';
import { CartItem } from '../../types';

interface FinalTicketProps {
  items: CartItem[];
  itemFinalPrices: Record<string, number>;
  subtotalLista: number;
  totalNeto: number;
  ahorro: number;
  remainingAmount: number;
  isEdit?: boolean;
  onSubmit: () => void;
}

const FinalTicket: React.FC<FinalTicketProps> = ({ 
  items, itemFinalPrices, subtotalLista, totalNeto, ahorro, remainingAmount, isEdit, onSubmit 
}) => {
  const formatVisual = (num: number) => new Intl.NumberFormat('es-AR').format(num);

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 space-y-4 shadow-sm relative overflow-hidden">
      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4" /> Resumen de Operación
      </h3>
      
      {/* Desglose de Productos */}
      <div className="space-y-2 border-b-2 border-dashed border-slate-100 pb-4">
        {items.map(item => (
          <div key={item.id} className="flex justify-between text-xs font-bold text-slate-600">
            <span className="flex-1 truncate uppercase">
              {item.quantity}x {item.product}
            </span>
            <span className="text-right ml-4">
              {item.listPrice !== itemFinalPrices[item.id] ? (
                <span className="flex flex-col items-end">
                  <span className="text-[9px] text-slate-300 line-through">
                    ${formatVisual(item.listPrice * item.quantity)}
                  </span>
                  <span className="text-emerald-500">
                    ${formatVisual(itemFinalPrices[item.id] * item.quantity)}
                  </span>
                </span>
              ) : (
                `$${formatVisual(item.listPrice * item.quantity)}`
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="space-y-1.5 text-xs font-bold pt-1">
        <div className="flex justify-between text-slate-400">
          <span>Subtotal Lista</span>
          <span>${formatVisual(subtotalLista)}</span>
        </div>
        
        {ahorro > 0 && (
          <div className="flex justify-between text-emerald-500">
            <span>Ahorro Aplicado</span>
            <span>-${formatVisual(ahorro)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-2xl font-black text-slate-800 pt-3 border-t border-slate-50">
          <span className="uppercase tracking-tighter italic">Total Neto</span>
          <span>${formatVisual(totalNeto)}</span>
        </div>
      </div>

      {/* Botón de Confirmación Dinámico */}
      <button 
        onClick={onSubmit}
        disabled={items.length === 0 || (remainingAmount !== 0 && totalNeto > 0)}
        className={`w-full h-16 mt-4 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${
          items.length > 0 && (remainingAmount === 0 || totalNeto < 0) 
            ? (isEdit ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white shadow-slate-200') 
            : 'bg-slate-100 text-slate-400 grayscale cursor-not-allowed'
        }`}
      >
        {totalNeto < 0 ? (
          <>
            <Send className="w-6 h-6" />
            <span>EMITIR VALE CRÉDITO</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-6 h-6" />
            <span>
              {isEdit ? 'GUARDAR CAMBIOS' : (remainingAmount > 0 ? 'FALTA SALDAR' : 'CONFIRMAR VENTA')}
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default FinalTicket;