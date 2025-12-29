import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Calendar, User, Minus, FileText, AlertCircle, Package, Hash, Ruler } from 'lucide-react';
import { SaleFormData, PaymentMethod, Sale, InventoryItem, InventoryFormData } from '../types';
import { PAYMENT_METHODS } from '../constants';

interface SalesFormProps {
  onSubmit: (data: SaleFormData) => void;
  onQuickCreate: (data: InventoryFormData) => void;
  nextSaleNumber: number;
  recentProducts: string[];
  sales: Sale[];
  inventory: InventoryItem[];
  initialDraft: { date: string; clientNumber: string; paymentMethod: PaymentMethod };
  onDraftChange: (draft: { date: string; clientNumber: string; paymentMethod: PaymentMethod }) => void;
}

const SalesForm: React.FC<SalesFormProps> = ({ 
  onSubmit, 
  sales,
  inventory,
  initialDraft, 
  onDraftChange 
}) => {
  // Inicializamos con el draft que viene de App.tsx para persistencia
  const [formData, setFormData] = useState<SaleFormData>({
    date: initialDraft.date,
    clientNumber: initialDraft.clientNumber,
    product: '',
    quantity: '1',
    price: '',
    paymentMethod: initialDraft.paymentMethod,
    size: '',
    notes: ''
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clientWarning, setClientWarning] = useState<string | null>(null);

  // 1. PERSISTENCIA: Avisamos a App.tsx cada vez que cambia el cliente o medio de pago
  useEffect(() => {
    onDraftChange({
      date: formData.date,
      clientNumber: formData.clientNumber,
      paymentMethod: formData.paymentMethod
    });
  }, [formData.date, formData.clientNumber, formData.paymentMethod]);

  // 2. LÓGICA DE CLIENTE: No permitir saltear números
  const maxClientToday = useMemo(() => {
    const todaySales = sales.filter(s => s.date === formData.date);
    if (todaySales.length === 0) return 0;
    const nums = todaySales.map(s => parseInt(s.client_number)).filter(n => !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) : 0;
  }, [sales, formData.date]);

  const allowedNextClient = maxClientToday + 1;

  // 3. FORMATEO DE PRECIO (Miles con punto)
  const formatVisualPrice = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, price: digitsOnly });
  };

  // 4. AUTOCOMPLETADO CORREGIDO
  const suggestions = useMemo(() => {
    if (formData.product.length < 2) return [];
    return inventory
      .filter(i => i.name.toLowerCase().includes(formData.product.toLowerCase()))
      .slice(0, 5);
  }, [formData.product, inventory]);

  const matchedInventoryItem = useMemo(() => {
    return inventory.find(item => item.name.trim().toLowerCase() === formData.product.trim().toLowerCase());
  }, [formData.product, inventory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clientInt = parseInt(formData.clientNumber) || 0;

    if (!formData.product || !formData.price || !formData.clientNumber) return;

    // Validación de número de cliente
    if (clientInt > allowedNextClient) {
      setClientWarning(`No puedes saltar al cliente #${clientInt}. El siguiente es #${allowedNextClient}`);
      setFormData(prev => ({ ...prev, clientNumber: allowedNextClient.toString() }));
      return;
    }

    if (matchedInventoryItem && Object.keys(matchedInventoryItem.sizes).length > 0 && !formData.size) {
      alert('Por favor, selecciona un talle.');
      return;
    }

    if (matchedInventoryItem && matchedInventoryItem.sizes[formData.size] === 0) {
      alert('No hay stock disponible para este talle.');
      return;
    }
    const currentSizeStock = matchedInventoryItem?.sizes[formData.size] ?? null;
    if (currentSizeStock !== null && parseInt(formData.quantity) > currentSizeStock) {
      const confirmOver = window.confirm(`¡Atención! Solo hay ${currentSizeStock} unidades en stock. ¿Deseas registrar la venta igual y dejar el stock en negativo?`);
      if (!confirmOver) return;
    }
    onSubmit(formData);
    setFormData(prev => ({ ...prev, product: '', price: '', quantity: '1', size: '', notes: '' }));
    setClientWarning(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Fecha */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Fecha</label>
          <div className="relative h-12 rounded-xl border-2 border-slate-100 bg-slate-50 flex items-center px-3">
            <Calendar className="w-5 h-5 text-primary mr-2" />
            <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="bg-transparent font-bold text-slate-800 outline-none w-full" required />
          </div>
        </div>

        {/* Cliente con Validación Estricta */}
        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase">N° de Cliente</label>
            <span className="text-[9px] text-primary font-bold">Máx hoy: {maxClientToday}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormData(p => ({...p, clientNumber: (Math.max(1, parseInt(p.clientNumber || '1') - 1)).toString()}))} className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center active:scale-90"><Minus /></button>
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                type="text" inputMode="numeric" 
                value={formData.clientNumber} 
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({...formData, clientNumber: val});
                  setClientWarning(null);
                }} 
                placeholder="1" 
                className="w-full h-12 pl-9 rounded-xl border-2 border-slate-100 text-center font-black text-xl focus:border-primary outline-none" 
                required 
              />
            </div>
            <button 
              type="button" 
              onClick={() => {
                const nextVal = parseInt(formData.clientNumber || '0') + 1;
                if (nextVal > allowedNextClient) {
                  setClientWarning(`Completa primero el cliente #${allowedNextClient}`);
                } else {
                  setFormData(p => ({...p, clientNumber: nextVal.toString()}));
                }
              }} 
              className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center active:scale-90"
            >
              <Plus />
            </button>
          </div>
          {clientWarning && <p className="text-[9px] text-amber-600 font-bold mt-1 animate-pulse"><AlertCircle className="w-3 h-3 inline mr-1" />{clientWarning}</p>}
        </div>

        {/* Producto y Autocompletado */}
        <div className="relative">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Prenda</label>
          <input
            type="text" value={formData.product}
            onChange={(e) => { setFormData({...formData, product: e.target.value}); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Buscar en inventario..."
            className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 font-bold focus:border-primary outline-none"
            required
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {suggestions.map((item) => (
                <button 
                  key={item.id} type="button" 
                  onClick={() => { 
                    setFormData({...formData, product: item.name, price: item.selling_price.toString()}); 
                    setShowSuggestions(false); 
                  }} 
                  className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-700">{item.name}</span>
                    <span className="text-[9px] text-slate-400 uppercase">{item.category} • {item.material}</span>
                  </div>
                  <span className="font-black text-primary text-sm">${item.selling_price.toLocaleString('es-AR')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Talles Dinámicos */}
        {matchedInventoryItem && Object.keys(matchedInventoryItem.sizes).length > 0 && Object.keys(matchedInventoryItem.sizes)[0] !== 'U' && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
              <Ruler className="w-3 h-3" /> Elegir Talle
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(matchedInventoryItem.sizes).map(([size, qty]) => (
                <button
                  key={size} type="button"
                  onClick={() => setFormData({...formData, size})}
                  className={`px-4 h-11 rounded-xl text-xs font-black border-2 transition-all ${formData.size === size ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {size} <span className="ml-1 opacity-60">({qty})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cantidad y Precio Formateado */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cantidad</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input type="text" inputMode="numeric" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value.replace(/\D/g, '')})} className="w-full h-12 pl-9 rounded-xl border-2 border-slate-100 font-black text-lg outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Precio Final</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-300">$</span>
              <input 
                type="text" inputMode="numeric" 
                value={formatVisualPrice(formData.price)} 
                onChange={handlePriceChange} 
                className="w-full h-12 pl-7 rounded-xl border-2 border-slate-100 font-black text-lg outline-none text-primary" 
                required 
              />
            </div>
          </div>
        </div>

        {/* Medio de Pago */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Medio de Pago</label>
          <select value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})} className="w-full h-12 px-3 rounded-xl border-2 border-slate-100 font-bold text-slate-700 outline-none bg-white">
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button type="submit" className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-lg">
          <Save className="w-6 h-6" /> Registrar Venta
        </button>
      </form>
    </div>
  );
};

export default SalesForm;