import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  InventoryItem, CartItem, MultiSaleData, PaymentSplit, PaymentBaseMethod, Voucher 
} from '../types';
import { 
  Plus, Trash2, ChevronLeft, ChevronRight, 
  Wand2, CheckCircle2, X, Send, Edit2, Calculator,
  Smartphone, CreditCard, Banknote, Ticket, Landmark, AlertTriangle
} from 'lucide-react';

interface SalesFormProps {
  onSubmit: (data: MultiSaleData) => void;
  inventory: InventoryItem[];
  vouchers: Voucher[];
  initialData: MultiSaleData | null;
  onChange?: (data: MultiSaleData) => void; // Prop para persistencia
  onCancelEdit: () => void;
  nextSaleNumber: number;
}

const PAYMENT_CONFIG: Record<PaymentBaseMethod, { bg: string, border: string, icon: any }> = {
  'Efectivo': { bg: 'bg-emerald-500', border: 'border-emerald-600', icon: Banknote },
  'Transferencia': { bg: 'bg-blue-600', border: 'border-blue-700', icon: Smartphone },
  'Débito': { bg: 'bg-amber-500', border: 'border-amber-600', icon: CreditCard },
  'Crédito': { bg: 'bg-rose-600', border: 'border-rose-700', icon: Landmark },
  'Vale': { bg: 'bg-orange-600', border: 'border-orange-700', icon: Ticket }
};

// Función Helper para obtener la fecha de Buenos Aires en formato YYYY-MM-DD
const getTodayAR = () => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

const SalesForm: React.FC<SalesFormProps> = ({ onSubmit, inventory, vouchers, initialData, onChange, onCancelEdit }) => {
  // Sincronizar con App.tsx
  const [date, setDate] = useState(initialData?.date || getTodayAR());
  const [cart, setCart] = useState<CartItem[]>(initialData?.items || []);
  const [payments, setPayments] = useState<PaymentSplit[]>(initialData?.payments || []);
  
  // Informar a App.tsx cuando el estado local cambie
  useEffect(() => {
    if (onChange) {
      onChange({
        date,
        items: cart,
        payments,
        isEdit: initialData?.isEdit,
        originalClientNumber: initialData?.originalClientNumber
      });
    }
  }, [date, cart, payments, onChange]);

  // Si initialData cambia externamente (ej: al cargar el localStorage en App)
  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setCart(initialData.items);
      setPayments(initialData.payments);
    }
  }, [initialData?.isEdit, initialData?.originalClientNumber]);

  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({
    name: '', price: '', quantity: '1', size: 'U', inventoryId: ''
  });

  const dateInputRef = useRef<HTMLInputElement>(null);

  const clearForm = () => {
    if (!window.confirm('¿Borrar todo el carrito actual?')) return;
    setCart([]);
    setPayments([]);
    setCurrentProduct({ name: '', price: '', quantity: '1', size: 'U', inventoryId: '' });
  };

  const formatVisual = (num: string | number) => {
    if (!num) return '';
    const clean = num.toString().replace(/\D/g, '');
    return new Intl.NumberFormat('es-AR').format(parseInt(clean));
  };
  const cleanNum = (val: string) => val.replace(/\D/g, '');

  const addToCart = () => {
    if (!currentProduct.name || !currentProduct.price) return;
    const newItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      product: currentProduct.name,
      quantity: parseInt(currentProduct.quantity),
      listPrice: parseInt(cleanNum(currentProduct.price)),
      finalPrice: parseInt(cleanNum(currentProduct.price)),
      size: currentProduct.size,
      inventory_id: currentProduct.inventoryId || undefined,
      cost_price: inventory.find(i => i.id === currentProduct.inventoryId)?.cost_price || 0
    };
    setCart([...cart, newItem]);
    setCurrentProduct({ name: '', price: '', quantity: '1', size: 'U', inventoryId: '' });
  };

  const editCartItem = (item: CartItem) => {
    setCurrentProduct({
      name: item.product,
      price: item.listPrice.toString(),
      quantity: item.quantity.toString(),
      size: item.size,
      inventoryId: item.inventory_id || ''
    });
    setCart(cart.filter(i => i.id !== item.id));
  };

  const totals = useMemo(() => {
    let subtotalLista = 0;
    let totalConDescuentos = 0;
    const itemFinalPrices: Record<string, number> = {};
    cart.forEach(item => {
      subtotalLista += item.listPrice * item.quantity;
      let price = item.listPrice;
      const hasDiscount = payments.some(p => p.method === 'Efectivo' && p.appliedToItems?.includes(item.id));
      if (hasDiscount) price = Math.round(price * 0.9);
      itemFinalPrices[item.id] = price;
      totalConDescuentos += price * item.quantity;
    });
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalConDescuentos - paid;
    return { subtotalLista, totalConDescuentos, ahorro: subtotalLista - totalConDescuentos, paid, remaining, itemFinalPrices };
  }, [cart, payments]);

  const toggleItemDiscount = (payIdx: number, itemId: string) => {
    const newPayments = [...payments];
    const p = newPayments[payIdx];
    if (!p.appliedToItems) p.appliedToItems = [];
    const isAddingDiscount = !p.appliedToItems.includes(itemId);
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    if (isAddingDiscount) p.appliedToItems.push(itemId);
    else p.appliedToItems = p.appliedToItems.filter(id => id !== itemId);
    const discountAmount = Math.round(item.listPrice * 0.1) * item.quantity;
    p.amount = isAddingDiscount ? p.amount - discountAmount : p.amount + discountAmount;
    setPayments(newPayments);
  };

  const handlePaymentAmountChange = (index: number, newAmount: number) => {
    const newPayments = [...payments];
    newPayments[index].amount = newAmount;
    if (newPayments.length === 2) {
      const otherIndex = index === 0 ? 1 : 0;
      newPayments[otherIndex].amount = Math.max(0, totals.totalConDescuentos - newAmount);
    }
    setPayments(newPayments);
  };

  const addPaymentMethod = (method: PaymentBaseMethod) => {
    const remaining = totals.totalConDescuentos - payments.reduce((sum, p) => sum + p.amount, 0);
    setPayments([...payments, { method, amount: Math.max(0, remaining), appliedToItems: [] }]);
    setShowPaymentSelector(false);
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Banner de Edición / Persistencia */}
      <div className="flex items-center justify-between gap-2">
        {initialData?.isEdit ? (
          <div className="flex-1 bg-amber-100 border-2 border-amber-400 p-3 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-tighter">Editando: {initialData.originalClientNumber}</span>
            </div>
            <button onClick={onCancelEdit} className="bg-amber-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px] active:scale-90">SALIR</button>
          </div>
        ) : cart.length > 0 ? (
          <button 
            onClick={clearForm}
            className="flex-1 bg-rose-50 border-2 border-rose-100 p-3 rounded-2xl flex items-center justify-center gap-2 text-rose-500 active:scale-95 transition-all shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Borrar Borrador</span>
          </button>
        ) : null}
      </div>

      {/* 1. Fecha */}
      <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
        <button onClick={() => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }} className="p-4 text-slate-400 active:scale-75 transition-all"><ChevronLeft /></button>
        <div onClick={() => dateInputRef.current?.showPicker()} className="flex-1 text-center py-2 cursor-pointer active:opacity-50 transition-all">
          <span className="text-base font-black text-slate-700">{new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <input ref={dateInputRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sr-only" />
        </div>
        <button onClick={() => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }} className="p-4 text-slate-400 active:scale-75 transition-all"><ChevronRight /></button>
      </div>

      {/* 2. Carga y Carrito */}
      <div className="bg-white rounded-3xl shadow-xl p-4 border border-slate-100 space-y-4">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-7">
            <input type="text" placeholder="Producto..." value={currentProduct.name} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold text-sm outline-none focus:border-primary uppercase" />
          </div>
          <div className="col-span-5 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
            <input type="text" inputMode="decimal" placeholder="Precio" value={formatVisual(currentProduct.price)} onChange={(e) => setCurrentProduct({...currentProduct, price: cleanNum(e.target.value)})} className="w-full h-12 pl-6 pr-3 rounded-xl bg-slate-50 border-2 border-slate-100 font-black text-sm outline-none focus:border-primary" />
          </div>
          <button onClick={addToCart} disabled={!currentProduct.name || !currentProduct.price} className="col-span-12 h-12 bg-primary text-white font-black rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5" /> AGREGAR AL CARRITO
          </button>
        </div>

        {cart.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-50">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[10px] text-slate-700 truncate uppercase tracking-tighter">{item.product} ({item.size})</p>
                </div>
                <div className="flex items-center gap-1">
                  <p className="font-black text-primary text-xs mr-2">${(totals.itemFinalPrices[item.id] * item.quantity).toLocaleString()}</p>
                  <button onClick={() => editCartItem(item)} className="p-2 text-slate-400 active:bg-slate-200 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="p-2 text-rose-400 active:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Pagos */}
      <div className="bg-white rounded-3xl shadow-xl p-5 border border-slate-100 space-y-4">
        <div className="flex justify-between items-end px-1 border-b border-slate-50 pb-3">
          <div><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Cobrado</h3><p className="text-3xl font-black text-slate-800 leading-none mt-1">${totals.paid.toLocaleString()}</p></div>
          <div className="text-right"><p className={`text-xs font-black ${totals.remaining === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{totals.remaining === 0 ? '✓ SALDADO' : totals.remaining < 0 ? `SOBRAN $${Math.abs(totals.remaining).toLocaleString()}` : `RESTA $${totals.remaining.toLocaleString()}`}</p></div>
        </div>
        
        {payments.map((p, idx) => (
          <div key={idx} className={`${PAYMENT_CONFIG[p.method].bg} p-4 rounded-3xl shadow-lg border-b-4 ${PAYMENT_CONFIG[p.method].border} relative animate-in zoom-in duration-200`}>
            <button onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 w-9 h-9 bg-black/20 backdrop-blur-md rounded-full text-white flex items-center justify-center active:scale-75 transition-all shadow-xl"><X className="w-5 h-5" /></button>
            <div className="flex gap-2 items-center">
              <div className="w-[140px] h-12 rounded-xl bg-white/20 flex items-center px-3 gap-2">{React.createElement(PAYMENT_CONFIG[p.method].icon, { className: "w-4 h-4 text-white" })}<span className="font-black text-xs text-white uppercase">{p.method}</span></div>
              <div className="flex-1 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/60">$</span><input type="text" inputMode="decimal" value={formatVisual(p.amount)} onChange={(e) => handlePaymentAmountChange(idx, parseInt(cleanNum(e.target.value)) || 0)} className="w-full h-12 pl-7 pr-3 rounded-xl bg-white/20 border-none font-black text-white outline-none text-lg tracking-tight" /></div>
            </div>

            {p.method === 'Efectivo' && totals.remaining !== 0 && (
              <div className="mt-3 flex gap-2">
                {[Math.round(totals.totalConDescuentos/500)*500, Math.round(totals.totalConDescuentos/1000)*1000].filter(s => s !== totals.totalConDescuentos).map(s => (
                  <button key={s} onClick={() => { const other = payments.filter((_, i) => i !== idx).reduce((sum, pay) => sum + pay.amount, 0); handlePaymentAmountChange(idx, s - other); }} className="flex-1 flex items-center justify-center gap-1 bg-white/20 text-white py-3 rounded-xl text-[10px] font-black border border-white/10 active:scale-95 transition-all uppercase"><Wand2 className="w-3.5 h-3.5" /> ${s.toLocaleString()}</button>
                ))}
              </div>
            )}
            {p.method === 'Crédito' && (<div className="mt-3 flex gap-1.5">{[1, 3, 6, 12].map(c => (<button key={c} onClick={() => { const n = [...payments]; n[idx].installments = c; setPayments(n); }} className={`flex-1 h-12 rounded-xl text-xs font-black transition-all ${p.installments === c ? 'bg-white text-rose-600 scale-105 shadow-md' : 'bg-white/20 text-white'}`}>{c} cuotas</button>))}</div>)}
            {p.method === 'Vale' && (<div className="mt-3"><select value={p.voucherCode} onChange={(e) => { const n = [...payments]; n[idx].voucherCode = e.target.value; setPayments(n); }} className="w-full h-12 rounded-xl bg-white/20 border-none font-black text-xs text-white outline-none px-4 backdrop-blur-md"><option value="" className="text-slate-800 italic">Seleccionar vale...</option>{vouchers.map(v => <option key={v.id} value={v.code} className="text-slate-800">{v.code} (${v.current_amount.toLocaleString()})</option>)}</select></div>)}
            {p.method === 'Efectivo' && cart.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20"><p className="text-[10px] font-black text-white/70 uppercase mb-2 ml-1 italic">Bonificación Especial (-10%)</p><div className="flex flex-wrap gap-1.5">{cart.map(item => (<button key={item.id} type="button" onClick={() => toggleItemDiscount(idx, item.id)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all shadow-sm ${p.appliedToItems?.includes(item.id) ? 'bg-white text-emerald-600 scale-105 shadow-lg' : 'bg-white/20 text-white'}`}>{item.product}</button>))}</div></div>
            )}
          </div>
        ))}

        {!showPaymentSelector ? (
          <button onClick={() => setShowPaymentSelector(true)} className="w-full py-5 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-xs active:bg-slate-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><Plus className="w-4 h-4" /> Agregar Medio de Pago</button>
        ) : (
          <div className="grid grid-cols-5 gap-2 animate-in slide-in-from-top-2">{(['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Vale'] as PaymentBaseMethod[]).map(m => (<button key={m} onClick={() => addPaymentMethod(m)} className={`${PAYMENT_CONFIG[m].bg} h-14 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all`}>{React.createElement(PAYMENT_CONFIG[m].icon, { className: "w-6 h-6" })}</button>))}</div>
        )}
      </div>

      {/* 4. Ticket Final */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 space-y-4 shadow-sm relative overflow-hidden">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Calculator className="w-4 h-4" /> Resumen de Operación</h3>
        <div className="space-y-2 border-b-2 border-dashed border-slate-100 pb-4">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between text-xs font-bold text-slate-600"><span className="flex-1 truncate uppercase">{item.product} ({item.size})</span><span className="text-right ml-4">{item.listPrice !== totals.itemFinalPrices[item.id] ? (<span className="flex flex-col items-end"><span className="text-[9px] text-slate-300 line-through">${item.listPrice.toLocaleString()}</span><span className="text-emerald-500">${totals.itemFinalPrices[item.id].toLocaleString()}</span></span>) : `$${item.listPrice.toLocaleString()}`}</span></div>
          ))}
        </div>
        <div className="space-y-1.5 text-xs font-bold pt-1">
          <div className="flex justify-between text-slate-400"><span>Subtotal Productos</span><span>${totals.subtotalLista.toLocaleString()}</span></div>
          {totals.ahorro > 0 && <div className="flex justify-between text-emerald-500"><span>Ahorro Clienta</span><span>-${totals.ahorro.toLocaleString()}</span></div>}
          <div className="flex justify-between text-xl font-black text-slate-800 pt-3 border-t border-slate-50"><span className="uppercase tracking-tighter italic">Total Neto</span><span>${totals.totalConDescuentos.toLocaleString()}</span></div>
        </div>

        <button 
          onClick={() => onSubmit({ date, items: cart.map(i => ({ ...i, finalPrice: totals.itemFinalPrices[i.id] })), payments, isEdit: initialData?.isEdit, originalClientNumber: initialData?.originalClientNumber })}
          disabled={cart.length === 0 || (totals.remaining !== 0 && totals.totalConDescuentos > 0)}
          className={`w-full h-16 mt-4 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${cart.length > 0 && (totals.remaining === 0 || totals.totalConDescuentos < 0) ? (initialData?.isEdit ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white shadow-slate-200') : 'bg-slate-100 text-slate-400 grayscale cursor-not-allowed'}`}
        >
          {totals.totalConDescuentos < 0 ? <Send className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          {totals.totalConDescuentos < 0 ? 'EMITIR VALE CRÉDITO' : (initialData?.isEdit ? 'GUARDAR CAMBIOS' : (totals.remaining > 0 ? 'FALTA SALDAR' : 'CONFIRMAR VENTA'))}
        </button>
      </div>
    </div>
  );
};

export default SalesForm;