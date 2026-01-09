import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, ChevronLeft, ChevronRight, 
  ShoppingCart, CreditCard, CheckCircle2, 
  Search, X, ShoppingBag, Minus, Clock, RefreshCcw
} from 'lucide-react';
import { 
  CartItem, PaymentSplit, PaymentMethod, 
  InventoryItem, MultiSaleData 
} from '../types';
import { PAYMENT_METHODS } from '../constants';

interface SalesFormProps {
  onSubmit: (data: MultiSaleData) => Promise<void>;
  inventory: InventoryItem[];
  nextSaleNumber: number;
  initialData: MultiSaleData | null;
  onCancelEdit: () => void;
}

const SalesForm: React.FC<SalesFormProps> = ({ onSubmit, inventory, initialData, onCancelEdit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<PaymentSplit[]>([{ method: 'Efectivo', amount: 0 }]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);

  // Entrada de producto
  const [currentProduct, setCurrentProduct] = useState('');
  const [currentSize, setCurrentSize] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setCart(initialData.items);
      setPayments(initialData.payments);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setCart([]);
      setPayments([{ method: 'Efectivo', amount: 0 }]);
    }
  }, [initialData]);

  // --- Helpers de Formateo ---
  const formatVisual = (val: string | number) => {
    if (val === '' || val === 0) return '';
    const num = val.toString().replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const cleanNum = (val: string) => val.replace(/\./g, '');

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * item.quantity * (item.isReturn ? -1 : 1)), 0)
  , [cart]);

  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const remainingAmount = cartTotal - totalPaid;

  useEffect(() => {
    if (payments.length === 1 && cartTotal > 0 && !initialData) {
      setPayments([{ ...payments[0], amount: cartTotal }]);
    }
  }, [cartTotal, initialData]);

  const suggestions = useMemo(() => {
    if (currentProduct.length < 2) return [];
    return inventory.filter(i => i.name.toLowerCase().includes(currentProduct.toLowerCase())).slice(0, 5);
  }, [currentProduct, inventory]);

  const matchedItem = useMemo(() => 
    inventory.find(i => i.name.trim().toLowerCase() === currentProduct.trim().toLowerCase()), 
  [currentProduct, inventory]);

  const addToCart = () => {
    const priceNum = parseFloat(cleanNum(currentPrice));
    if (!currentProduct || isNaN(priceNum)) return;
    
    const newItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      product: currentProduct,
      quantity: currentQty,
      price: priceNum,
      size: currentSize || 'U',
      inventory_id: matchedItem?.id,
      cost_price: matchedItem?.cost_price || 0,
      isReturn: false
    };
    setCart([...cart, newItem]);
    setCurrentProduct(''); setCurrentSize(''); setCurrentPrice(''); setCurrentQty(1);
  };

  const handleFinalSubmit = async () => {
    if (cart.length === 0) return;
    
    const summary = cart.map(i => `${i.isReturn ? '↺' : ''}${i.quantity}x ${i.product}`).join(', ');
    
    await onSubmit({ 
      date, 
      items: cart, 
      payments,
      isEdit: initialData?.isEdit,
      originalClientNumber: initialData?.originalClientNumber
    });
    
    setRecentHistory(prev => [summary, ...prev].slice(0, 3));
    setCart([]); 
    setPayments([{ method: 'Efectivo', amount: 0 }]);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      
      {initialData?.isEdit && (
        <div className="bg-amber-100 border-2 border-amber-400 p-4 rounded-2xl flex justify-between items-center animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <RefreshCcw className="w-5 h-5 text-amber-600 animate-spin-slow" />
            <p className="text-amber-900 font-black text-xs uppercase">Editando: {initialData.originalClientNumber}</p>
          </div>
          <button onClick={onCancelEdit} className="bg-white px-3 py-2 rounded-xl font-black text-[10px] text-amber-600 border border-amber-200">CANCELAR</button>
        </div>
      )}

      {/* 1. Selector de Fecha */}
      <div className="bg-white rounded-[1.5rem] p-2 shadow-sm border-2 border-slate-200 flex items-center justify-between">
        <button type="button" onClick={() => {
          const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() - 1);
          setDate(d.toISOString().split('T')[0]);
        }} className="w-12 h-12 flex items-center justify-center text-slate-400 active:bg-slate-50 rounded-full"><ChevronLeft /></button>
        
        <div className="relative font-black text-slate-700 text-xs uppercase px-4 py-2 bg-slate-50 rounded-xl cursor-pointer" onClick={() => dateInputRef.current?.showPicker()}>
           <input ref={dateInputRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 opacity-0 pointer-events-none" />
           {new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>

        <button type="button" onClick={() => {
          const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + 1);
          setDate(d.toISOString().split('T')[0]);
        }} className="w-12 h-12 flex items-center justify-center text-slate-400 active:bg-slate-50 rounded-full"><ChevronRight /></button>
      </div>

      {/* 2. Entrada de Producto */}
      <div className="bg-white rounded-[2rem] p-6 shadow-lg border-2 border-slate-100 space-y-4">
        <div className="relative">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block tracking-widest">Prenda / Producto</label>
          <div className="relative mt-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" value={currentProduct} onChange={(e) => { setCurrentProduct(e.target.value); setShowSuggestions(true); }} placeholder="Buscar..." className="w-full h-14 pl-11 pr-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none" />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-2xl border-2 border-slate-100 overflow-hidden">
              {suggestions.map(item => (
                <button key={item.id} type="button" onClick={() => { setCurrentProduct(item.name); setCurrentPrice(item.selling_price.toString()); setShowSuggestions(false); }} className="w-full p-4 text-left hover:bg-slate-50 border-b border-slate-50 flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                  <span className="font-black text-primary">${formatVisual(item.selling_price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Precio</label>
            <div className="relative mt-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
              <input type="text" inputMode="decimal" value={formatVisual(currentPrice)} onChange={(e) => setCurrentPrice(cleanNum(e.target.value))} className="w-full h-14 pl-8 pr-4 rounded-2xl bg-slate-50 border-none font-black text-primary text-xl outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Cantidad</label>
            <div className="flex h-14 bg-slate-50 rounded-2xl overflow-hidden mt-1 border border-slate-200">
              <button type="button" onClick={() => setCurrentQty(Math.max(1, currentQty - 1))} className="flex-1 flex items-center justify-center text-slate-400 active:bg-slate-100"><Minus className="w-5 h-5" /></button>
              <div className="flex-1 flex items-center justify-center font-black text-slate-700 text-lg">{currentQty}</div>
              <button type="button" onClick={() => setCurrentQty(currentQty + 1)} className="flex-1 flex items-center justify-center active:bg-slate-100"><Plus className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

        <button type="button" onClick={addToCart} className="w-full h-16 bg-slate-900 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl transition-all">
          <ShoppingCart className="w-5 h-5 text-primary" /> AGREGAR
        </button>
      </div>

      {/* 3. Carrito */}
      {cart.length > 0 && (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border-2 border-slate-300">
          <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-widest"><ShoppingBag className="w-4 h-4"/> CARRITO</h3>
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${item.isReturn ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-200'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.isReturn && <span className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Devolución</span>}
                    <p className={`font-black text-sm uppercase truncate ${item.isReturn ? 'text-rose-700' : 'text-slate-800'}`}>{item.product}</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">{item.quantity} UN. x ${formatVisual(item.price)}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`font-black text-base ${item.isReturn ? 'text-rose-600' : 'text-slate-900'}`}>
                    {item.isReturn ? '-' : ''}${formatVisual(item.price * item.quantity)}
                  </span>
                  <button type="button" onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="w-10 h-10 flex items-center justify-center text-rose-400 bg-white rounded-xl border-2 border-rose-100 active:bg-rose-600 active:text-white"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t-4 border-double border-slate-200 flex justify-between items-center mt-4 px-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest">A COBRAR</span>
              <span className={`text-3xl font-black ${cartTotal < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                ${formatVisual(Math.abs(cartTotal))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Medios de Pago */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border-2 border-slate-200 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-3 h-3"/> PAGO</h3>
          {cart.length > 0 && (
            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${remainingAmount <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {remainingAmount <= 0 ? 'SALDADO' : `RESTA $${formatVisual(remainingAmount)}`}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {payments.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <select value={p.method} onChange={(e) => { const n = [...payments]; n[idx].method = e.target.value as PaymentMethod; setPayments(n); }} className="flex-1 h-14 px-4 rounded-2xl bg-slate-50 border-none font-black text-xs outline-none">{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select>
              <div className="relative w-36">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                <input type="text" inputMode="decimal" value={formatVisual(p.amount)} onChange={(e) => { const n = [...payments]; const val = cleanNum(e.target.value); n[idx].amount = val === '' ? 0 : parseFloat(val); setPayments(n); }} className="w-full h-14 pl-8 pr-4 rounded-2xl bg-slate-50 border-none font-black text-right text-primary text-lg outline-none" />
              </div>
              {payments.length > 1 && <button type="button" onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="w-14 h-14 flex items-center justify-center text-slate-300 active:text-rose-500"><X className="w-6 h-6" /></button>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setPayments([...payments, { method: 'Efectivo', amount: remainingAmount > 0 ? remainingAmount : 0 }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest">+ OTRO MEDIO</button>
      </div>

      <button type="button" onClick={handleFinalSubmit} disabled={cart.length === 0 || (cartTotal > 0 && totalPaid === 0)} className={`w-full h-16 rounded-[1.5rem] font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4 ${cart.length > 0 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
        <CheckCircle2 className="w-6 h-6" /> 
        {initialData?.isEdit ? 'GUARDAR CAMBIOS' : (remainingAmount <= 0 ? 'CONFIRMAR VENTA' : 'CONFIRMAR SEÑA')}
      </button>

      {!initialData?.isEdit && recentHistory.length > 0 && (
        <div className="pt-4 px-2">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recién Anotados</span>
          </div>
          <div className="space-y-2">
            {recentHistory.map((item, idx) => (
              <div key={idx} className="bg-white/50 border-2 border-slate-100 p-4 rounded-2xl flex items-center gap-3 opacity-60">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-black text-slate-600 truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesForm;