import React, { useMemo, useState } from 'react';
import { Expense } from '../types';
import { 
  Package, Home, Zap, Landmark, History, 
  Hammer, User, Trash2, Edit3, Calendar, Receipt, Search, Filter, X 
} from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: any, color: string, bg: string, border: string }> = {
  'Mercadería': { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  'Alquiler': { icon: Home, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  'Servicios': { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  'Impuestos': { icon: Landmark, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  'Moratoria': { icon: History, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  'Inversión': { icon: Hammer, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  'Personal': { icon: User, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
};

type Period = 'all' | 'today' | 'week' | 'month';

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [showFilters, setShowFilters] = useState(false);

  // --- Lógica de Filtrado ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Filtro de Texto (Descripción o Categoría)
      const matchesSearch = 
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Filtro de Tiempo
      if (period === 'all') return true;
      
      const expDate = new Date(exp.date + 'T12:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (period === 'today') {
        return exp.date === now.toISOString().split('T')[0];
      }
      if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return expDate >= weekAgo;
      }
      if (period === 'month') {
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [expenses, searchTerm, period]);

  // --- Agrupamiento ---
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(exp => {
      const date = new Date(exp.date + 'T12:00:00');
      const monthYear = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase();
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(exp);
    });
    return Object.entries(groups);
  }, [filteredExpenses]);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
        <Receipt className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-bold">No hay gastos registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="sticky top-0 z-30 bg-slate-50 pt-2 pb-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar gasto o categoría..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm font-bold text-sm outline-none focus:border-rose-400 transition-all uppercase tracking-tighter"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${showFilters || period !== 'all' ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-white border-slate-100 text-slate-400 shadow-sm'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* CHIPS DE FILTRO DE TIEMPO */}
        {(showFilters || period !== 'all') && (
          <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300 overflow-x-auto pb-1 px-1">
            {[
              { id: 'today', label: 'Hoy', icon: Calendar },
              { id: 'week', label: 'Semana', icon: Calendar },
              { id: 'month', label: 'Mes', icon: Calendar },
              { id: 'all', label: 'Todo', icon: Filter }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as Period)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${period === p.id ? 'bg-rose-500 text-white shadow-md scale-105' : 'bg-white text-slate-400 border border-slate-100'}`}
              >
                <p.icon className="w-3 h-3" />
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LISTA AGRUPADA */}
      {groupedExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <Receipt className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold">No se encontraron gastos</p>
        </div>
      ) : (
        groupedExpenses.map(([monthYear, items]) => (
          <div key={monthYear} className="space-y-4">
            <div className="flex items-center gap-4 px-2">
              <div className="h-[1px] flex-1 bg-slate-200" />
              <span className="text-[10px] font-black text-slate-400 tracking-[0.2em]">{monthYear}</span>
              <div className="h-[1px] flex-1 bg-slate-200" />
            </div>

            <div className="space-y-4">
              {items.map((expense) => {
                const config = CATEGORY_CONFIG[expense.category] || { icon: Receipt, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' };
                const invAmount = expense.invoice_amount || 0;
                const percentage = expense.amount > 0 ? (invAmount / expense.amount * 100) : 0;

                return (
                  <div key={expense.id} className={`${config.bg} rounded-3xl shadow-sm border-2 ${config.border} overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500`}>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl shadow-sm bg-white/80 ${config.color}`}>
                            <config.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-white/90 ${config.color} border border-current/10`}>
                              {expense.category}
                            </span>
                            <p className="text-base font-black text-slate-800 leading-tight uppercase tracking-tighter mt-1">{expense.description}</p>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mt-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(expense.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-rose-600 tracking-tighter">
                            -${expense.amount.toLocaleString('es-AR')}
                          </p>
                        </div>
                      </div>

                      {expense.has_invoice_a && (
                        <div className="flex items-center justify-between bg-white/40 p-3 rounded-2xl border border-white/60 mb-4">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-blue-500" />
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                              FACTURA A: <span className="text-sm font-black ml-1 text-blue-700">${invAmount.toLocaleString('es-AR')}</span>
                            </p>
                          </div>
                          <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg border border-blue-200 flex items-center shadow-sm">
                            <span className="text-[9px] font-black">{Math.round(percentage)}%</span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button onClick={() => onEdit(expense)} className="h-12 bg-white/80 hover:bg-white text-slate-600 rounded-2xl flex items-center justify-center gap-2 border border-white shadow-sm active:scale-95 transition-all">
                          <Edit3 className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Corregir</span>
                        </button>
                        <button onClick={() => onDelete(expense.id)} className="h-12 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-2xl flex items-center justify-center gap-2 border border-rose-200 shadow-sm active:scale-95 transition-all">
                          <Trash2 className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Borrar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ExpenseList;