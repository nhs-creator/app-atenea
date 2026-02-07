import React, { useRef } from 'react';
import { ExpenseFormData } from '../types';
import { 
  ChevronLeft, ChevronRight, Save, AlertCircle, X,
  ArrowDownCircle, Receipt
} from 'lucide-react';
import { BUSINESS_CATEGORIES, PERSONAL_CATEGORIES } from '../constants';
import CategoryButton from './CategoryButton';

interface ExpenseFormProps {
  formData: ExpenseFormData;
  onChange: (data: ExpenseFormData) => void;
  onSubmit: (data: ExpenseFormData) => void;
  onCancelEdit?: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ formData, onChange, onSubmit, onCancelEdit }) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const currentCategories = formData.type === 'personal' 
    ? PERSONAL_CATEGORIES 
    : BUSINESS_CATEGORIES;

  const formatVisual = (num: string | number) => {
    if (!num) return '';
    const clean = num.toString().replace(/\D/g, '');
    return new Intl.NumberFormat('es-AR').format(parseInt(clean));
  };
  
  const cleanNum = (val: string) => val.replace(/\D/g, '');

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Banner de Edición */}
      {formData.isEdit && (
        <div className="bg-indigo-100 border-2 border-indigo-400 p-3 rounded-2xl flex items-center justify-between shadow-lg shadow-indigo-100 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-black text-indigo-800 uppercase tracking-tighter">Editando Gasto: {formData.category}</span>
          </div>
          <button 
            onClick={onCancelEdit}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px] active:scale-90 transition-all flex items-center gap-1"
          >
            <X className="w-3 h-3" /> SALIR
          </button>
        </div>
      )}

      {/* 1. Selector de Fecha */}
      <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
        <button onClick={() => { const d = new Date(formData.date + 'T12:00:00'); d.setDate(d.getDate() - 1); onChange({...formData, date: d.toISOString().split('T')[0]}); }} className="p-4 text-slate-400 active:scale-75 transition-all"><ChevronLeft /></button>
        <div onClick={() => dateInputRef.current?.showPicker()} className="flex-1 text-center py-2 cursor-pointer active:opacity-50 transition-all">
          <span className="text-base font-black text-slate-700">{new Date(formData.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <input ref={dateInputRef} type="date" value={formData.date} onChange={(e) => onChange({...formData, date: e.target.value})} className="sr-only" />
        </div>
        <button onClick={() => { const d = new Date(formData.date + 'T12:00:00'); d.setDate(d.getDate() + 1); onChange({...formData, date: d.toISOString().split('T')[0]}); }} className="p-4 text-slate-400 active:scale-75 transition-all"><ChevronRight /></button>
      </div>

      {/* 2. Datos del Gasto */}
      <div className="bg-white rounded-3xl shadow-xl p-5 border border-slate-100 space-y-4">
        <div className="space-y-4">
          <input type="text" placeholder="¿EN QUÉ GASTASTE?" value={formData.description} onChange={(e) => onChange({...formData, description: e.target.value})} className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-sm outline-none focus:border-rose-400 transition-all uppercase tracking-tight" />
          
          <div className="relative">
            <span className={`absolute left-5 top-1/2 -translate-y-1/2 font-black text-xl ${formData.type === 'personal' ? 'text-pink-500' : 'text-rose-500'}`}>$</span>
            <input type="text" inputMode="decimal" placeholder="Monto total" value={formatVisual(formData.amount)} onChange={(e) => onChange({...formData, amount: cleanNum(e.target.value)})} className="w-full h-16 pl-10 pr-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-2xl outline-none focus:border-rose-400 transition-all text-slate-800" />
          </div>
        </div>

        {/* 3. Categorías Dinámicas (Grid de 4) */}
        <div className="pt-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 text-center italic">Categoría {formData.type === 'personal' ? 'Personal' : 'de Negocio'}</p>
          <div className="grid grid-cols-4 gap-2">
            {currentCategories.map((cat) => (
              <CategoryButton
                key={cat.id}
                category={cat}
                isActive={formData.category === cat.id}
                onClick={() => onChange({...formData, category: cat.id})}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 4. Factura A (Solo para Negocio) */}
      {formData.type === 'business' && (
        <div className="bg-white rounded-3xl shadow-lg p-5 border border-slate-100 space-y-4">
          <button 
            onClick={() => onChange({...formData, hasInvoiceA: !formData.hasInvoiceA})}
            className={`w-full h-14 rounded-2xl border-2 flex items-center justify-between px-5 transition-all ${
              formData.hasInvoiceA ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5" />
              <span className="font-black text-[10px] uppercase tracking-widest">¿Tiene Factura A?</span>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.hasInvoiceA ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
              {formData.hasInvoiceA && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
          </button>

          {formData.hasInvoiceA && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold">$</span>
                <input type="text" inputMode="decimal" placeholder="Monto facturado..." value={formatVisual(formData.invoiceAmount)} onChange={(e) => onChange({...formData, invoiceAmount: cleanNum(e.target.value)})} className="w-full h-12 pl-8 pr-4 rounded-xl bg-blue-50/30 border-2 border-blue-100 font-black text-sm outline-none focus:border-blue-400 text-blue-700" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Botón de Registro */}
      <button 
        onClick={() => onSubmit(formData)}
        disabled={!formData.description || !formData.amount}
        className={`w-full h-16 rounded-3xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${
          formData.description && formData.amount
            ? (formData.isEdit ? 'bg-indigo-600 text-white active:scale-95 shadow-indigo-200' : (formData.type === 'personal' ? 'bg-pink-600 text-white active:scale-95 shadow-pink-200' : 'bg-rose-600 text-white active:scale-95 shadow-rose-200'))
            : 'bg-slate-100 text-slate-400 grayscale cursor-not-allowed'
        }`}
      >
        {formData.isEdit ? <Save className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
        {formData.isEdit ? 'GUARDAR CAMBIOS' : `REGISTRAR GASTO ${formData.type === 'personal' ? 'PERSONAL' : 'NEGOCIO'}`}
      </button>
    </div>
  );
};


export default ExpenseForm;
