import React, { useState } from 'react';
import { 
  X, Plus, Smartphone, CreditCard, Banknote, Ticket, Landmark 
} from 'lucide-react';
import { PaymentSplit, PaymentBaseMethod, Voucher, CartItem } from '../../types';

interface PaymentManagerProps {
  payments: PaymentSplit[];
  onPaymentsChange: (newPayments: PaymentSplit[]) => void;
  vouchers: Voucher[];
  totalNeto: number; // Recibe el 'theoreticalTotal' desde SalesForm
  paidAmount: number;
  remainingAmount: number;
  cartItems: CartItem[];
}

const PAYMENT_CONFIG: Record<PaymentBaseMethod, { bg: string, border: string, icon: any }> = {
  'Efectivo': { bg: 'bg-emerald-500', border: 'border-emerald-600', icon: Banknote },
  'Transferencia': { bg: 'bg-blue-600', border: 'border-blue-700', icon: Smartphone },
  'Débito': { bg: 'bg-amber-500', border: 'border-amber-600', icon: CreditCard },
  'Crédito': { bg: 'bg-rose-600', border: 'border-rose-700', icon: Landmark },
  'Vale': { bg: 'bg-orange-600', border: 'border-orange-700', icon: Ticket }
};

const PaymentManager: React.FC<PaymentManagerProps> = ({ 
  payments, onPaymentsChange, vouchers, totalNeto, paidAmount, remainingAmount, cartItems 
}) => {
  const [showSelector, setShowSelector] = useState(false);

  const formatVisual = (num: number) => new Intl.NumberFormat('es-AR').format(num);
  const cleanNum = (val: string) => parseInt(val.replace(/\D/g, '')) || 0;

  const addMethod = (method: PaymentBaseMethod) => {
    const newPayment: PaymentSplit = { 
      method, 
      amount: Math.max(0, remainingAmount), 
      appliedToItems: [],
      roundingBase: null
    };
    onPaymentsChange([...payments, newPayment]);
    setShowSelector(false);
  };

  const updatePayment = (idx: number, updates: Partial<PaymentSplit>) => {
    const newPayments = [...payments];
    newPayments[idx] = { ...newPayments[idx], ...updates };

    // LÓGICA DE BALANCEO: Si hay exactamente 2 pagos y estamos cambiando un monto manualmente
    if (newPayments.length === 2 && updates.amount !== undefined) {
      const otherIdx = idx === 0 ? 1 : 0;
      // El otro pago se ajusta al total teórico (memoria) menos lo que se escribió aquí
      newPayments[otherIdx].amount = Math.max(0, totalNeto - updates.amount);
    }

    onPaymentsChange(newPayments);
  };

  const removePayment = (idx: number) => {
    onPaymentsChange(payments.filter((_, i) => i !== idx));
  };

  const toggleDiscount = (payIdx: number, itemId: string) => {
    const p = payments[payIdx];
    const isAdding = !p.appliedToItems?.includes(itemId);
    const newApplied = isAdding 
      ? [...(p.appliedToItems || []), itemId] 
      : (p.appliedToItems || []).filter(id => id !== itemId);
    
    updatePayment(payIdx, { appliedToItems: newApplied });
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-5 border border-slate-100 space-y-4">
      {/* Resumen de Cobro Superior */}
      <div className="flex justify-between items-end px-1 border-b border-slate-50 pb-3">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Saldo Cobrado</h3>
          <p className="text-3xl font-black text-slate-800 leading-none mt-1">${formatVisual(paidAmount)}</p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-black ${remainingAmount === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {remainingAmount === 0 ? '✓ SALDADO' : remainingAmount < 0 ? `SOBRAN $${formatVisual(Math.abs(remainingAmount))}` : `RESTA $${formatVisual(remainingAmount)}`}
          </p>
        </div>
      </div>
      
      {/* Listado de Pagos Activos */}
      {payments.map((p, idx) => (
        <div key={idx} className={`${PAYMENT_CONFIG[p.method].bg} p-4 rounded-3xl shadow-lg border-b-4 ${PAYMENT_CONFIG[p.method].border} relative animate-in zoom-in duration-200`}>
          <button 
            onClick={() => removePayment(idx)} 
            className="absolute -top-1 -right-1 w-9 h-9 bg-black/20 backdrop-blur-md rounded-full text-white flex items-center justify-center active:scale-75 transition-all shadow-xl"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex gap-2 items-center">
            <div className="w-[140px] h-12 rounded-xl bg-white/20 flex items-center px-3 gap-2">
              {React.createElement(PAYMENT_CONFIG[p.method].icon, { className: "w-4 h-4 text-white" })}
              <span className="font-black text-xs text-white uppercase">{p.method}</span>
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/60">$</span>
              <input 
                type="text" 
                inputMode="decimal" 
                value={formatVisual(p.amount)} 
                onChange={(e) => updatePayment(idx, { amount: cleanNum(e.target.value) })} 
                className="w-full h-12 pl-7 pr-3 rounded-xl bg-white/20 border-none font-black text-white outline-none text-lg tracking-tight" 
              />
            </div>
          </div>

          {/* SELECTOR DE REDONDEO DINÁMICO CORREGIDO */}
          {p.method === 'Efectivo' && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-[10px] font-black text-white/70 uppercase ml-1 italic">Redondeo Antivuelto</p>
              <div className="flex gap-1.5">
                {([null, 100, 500, 1000] as (100 | 500 | 1000 | null)[]).map((base) => (
                  <button
                    key={base === null ? 'none' : base}
                    onClick={() => {
                      // Calculamos la parte de la venta que NO cubren otros medios de pago
                      const otherPaymentsTotal = payments.filter((_, i) => i !== idx).reduce((sum, pay) => sum + pay.amount, 0);
                      
                      // El monto "ideal" que debería pagar para saldar el total real
                      const idealAmount = totalNeto - otherPaymentsTotal;
                      
                      let newAmount = idealAmount;
                      if (base) {
                        // Redondeamos el TOTAL NETO global, y luego restamos los otros pagos
                        const roundedTotal = Math.floor(totalNeto / base) * base;
                        newAmount = Math.max(0, roundedTotal - otherPaymentsTotal);
                      }
                      
                      updatePayment(idx, { roundingBase: base, amount: newAmount });
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                      p.roundingBase === base 
                        ? 'bg-white text-emerald-600 border-white shadow-lg scale-105' 
                        : 'bg-white/10 text-white border-white/10 active:scale-95'
                    }`}
                  >
                    {base === null ? 'SIN' : `$${base}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cuotas para Crédito */}
          {p.method === 'Crédito' && (
            <div className="mt-3 flex gap-1.5">
              {[1, 3, 6, 12].map(c => (
                <button 
                  key={c} 
                  onClick={() => updatePayment(idx, { installments: c })} 
                  className={`flex-1 h-12 rounded-xl text-xs font-black transition-all ${p.installments === c ? 'bg-white text-rose-600 scale-105 shadow-md' : 'bg-white/20 text-white'}`}
                >
                  {c} ctas
                </button>
              ))}
            </div>
          )}

          {/* Bonificación por Efectivo */}
          {p.method === 'Efectivo' && cartItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-[10px] font-black text-white/70 uppercase mb-2 ml-1 italic">Bonificación Especial -10%</p>
              <div className="flex flex-wrap gap-1.5">
                {cartItems.map(item => (
                  <button 
                    key={item.id} 
                    type="button" 
                    onClick={() => toggleDiscount(idx, item.id)} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all shadow-sm ${p.appliedToItems?.includes(item.id) ? 'bg-white text-emerald-600 scale-105 shadow-lg' : 'bg-white/20 text-white'}`}
                  >
                    {item.product}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Botón para Añadir Nuevo Medio de Pago */}
      {!showSelector ? (
        <button 
          onClick={() => setShowSelector(true)} 
          className="w-full py-5 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-xs active:bg-slate-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" /> Medio de Pago
        </button>
      ) : (
        <div className="grid grid-cols-5 gap-2 animate-in slide-in-from-top-2">
          {(['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Vale'] as PaymentBaseMethod[]).map(m => (
            <button 
              key={m} 
              onClick={() => addMethod(m)} 
              className={`${PAYMENT_CONFIG[m].bg} h-14 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all`}
            >
              {React.createElement(PAYMENT_CONFIG[m].icon, { className: "w-6 h-6" })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentManager;