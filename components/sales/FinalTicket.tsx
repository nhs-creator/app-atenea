import React from 'react';
import { Calculator, Send, CheckCircle2, MessageCircle } from 'lucide-react';
import { CartItem } from '../../types';

interface FinalTicketProps {
  items: CartItem[];
  itemFinalPrices: Record<string, number>;
  subtotalLista: number;
  totalNeto: number;
  ahorro: number;
  remainingAmount: number;
  isEdit?: boolean;
  clientId?: string;
  clientDraft?: any;
  sendWhatsApp?: boolean;
  onWhatsAppToggle: (val: boolean) => void;
  onSubmit: () => void;
}

const FinalTicket: React.FC<FinalTicketProps> = ({ 
  items, itemFinalPrices, subtotalLista, totalNeto, ahorro, remainingAmount, isEdit, 
  clientId, clientDraft, sendWhatsApp, onWhatsAppToggle, onSubmit 
}) => {
  const formatVisual = (num: number) => new Intl.NumberFormat('es-AR').format(num);

  const canSubmit = items.length > 0 && (remainingAmount === 0 || totalNeto < 0);
  const hasCustomer = !!(clientId || clientDraft);

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 space-y-4 shadow-sm relative overflow-hidden">
      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4" /> Resumen de Operación
      </h3>
      
      {/* Desglose de Productos */}
      <div className="space-y-2 border-b-2 border-dashed border-slate-100 pb-4">
        {items.map(item => (
          <div key={item.id} className="flex justify-between text-xs font-bold text-slate-600">
            <div className="flex-1 truncate uppercase pr-2">
              <span className="text-primary mr-1">{item.quantity}x</span>
              {item.product}
              <span className="text-[9px] text-slate-400 font-black ml-1">({item.size || 'U'})</span>
            </div>
            <div className="text-right shrink-0">
              {item.listPrice !== itemFinalPrices[item.id] ? (
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-slate-300 line-through">
                    ${formatVisual(item.listPrice * item.quantity)}
                  </span>
                  <span className="text-emerald-500">
                    ${formatVisual(itemFinalPrices[item.id] * item.quantity)}
                  </span>
                </div>
              ) : (
                `$${formatVisual(item.listPrice * item.quantity)}`
              )}
            </div>
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

      {/* Switch WhatsApp */}
      {hasCustomer && (
        <div className="pt-2">
          <button 
            onClick={() => onWhatsAppToggle(!sendWhatsApp)}
            className={`w-full h-12 rounded-2xl border-2 transition-all flex items-center justify-between px-4 ${
              sendWhatsApp 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-slate-100 bg-slate-50 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className={`w-4 h-4 ${sendWhatsApp ? 'animate-bounce' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Enviar Ticket por WhatsApp</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${sendWhatsApp ? 'bg-green-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${sendWhatsApp ? 'right-1' : 'left-1'}`} />
            </div>
          </button>
        </div>
      )}

      {/* Botón de Confirmación */}
      <button 
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`w-full h-16 mt-2 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${
          canSubmit
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