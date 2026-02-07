import React, { useMemo, useState } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { 
  Receipt, Search, ChevronLeft, ChevronRight, X, Calendar, Edit3, Trash2
} from 'lucide-react';
import { CATEGORY_METADATA } from '../constants';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());

  // --- Navegación de Meses ---
  const handlePrevMonth = () => {
    const d = new Date(selectedMonthDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedMonthDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedMonthDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedMonthDate(d);
  };

  // --- Lógica de Filtrado ---
  const filteredExpenses = useMemo(() => {
    const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
    const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);

    return expenses.filter(exp => {
      // Filtro de Tiempo
      const expDate = new Date(exp.date + 'T12:00:00');
      const isInMonth = expDate >= startOfMonth && expDate <= endOfMonth;
      if (!isInMonth) return false;

      // Filtro de Búsqueda
      const matchesSearch = 
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [expenses, selectedMonthDate, searchTerm]);

  // --- Totales del Mes ---
  const totalMes = useMemo(() => 
    filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  , [filteredExpenses]);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      {/* 1. Selector de Mes */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm sticky top-0 z-30">
        <button onClick={handlePrevMonth} className="p-3 text-slate-400 active:scale-75 transition-all"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Historial de</span>
          <span className="text-sm font-black text-slate-700 uppercase">
            {selectedMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button onClick={handleNextMonth} className="p-3 text-slate-400 active:scale-75 transition-all"><ChevronRight /></button>
      </div>

      {/* 2. Buscador y Resumen */}
      <div className="px-1 space-y-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input 
            type="text" 
            placeholder="Buscar por descripción o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border-2 border-slate-100 shadow-sm font-bold text-sm outline-none focus:border-rose-400 transition-all uppercase tracking-tighter"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400"><X className="w-3 h-3" /></button>
          )}
        </div>
        
        <div className="bg-slate-900 p-4 rounded-2xl shadow-lg flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Total del período</span>
          </div>
          <span className="text-xl font-black">-${totalMes.toLocaleString('es-AR')}</span>
        </div>
      </div>

      {/* 3. Listado de Gastos */}
      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <Receipt className="w-12 h-12 mb-2 opacity-10" />
          <p className="font-black text-[10px] uppercase tracking-[0.2em]">Sin movimientos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const metadata = CATEGORY_METADATA[expense.category as ExpenseCategory];
            const Icon = metadata ? metadata.icon : Receipt;
            const styles = metadata ? metadata.styles : { 
              bg: 'bg-slate-50', 
              text: 'text-slate-600', 
              iconColor: 'text-slate-400' 
            };
            const isPersonal = expense.type === 'personal';

            return (
              <div 
                key={expense.id} 
                className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all active:scale-[0.98]`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${styles.bg} ${styles.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${isPersonal ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                            {isPersonal ? 'Personal' : 'Negocio'}
                          </span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter bg-slate-100 text-slate-500`}>
                            {expense.category}
                          </span>
                        </div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tighter mt-1">{expense.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black tracking-tighter ${isPersonal ? 'text-pink-600' : 'text-rose-600'}`}>
                        -${expense.amount.toLocaleString('es-AR')}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-slate-400 uppercase">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(expense.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>

                  {expense.has_invoice_a && (
                    <div className="flex items-center justify-between bg-blue-50/50 p-2 px-3 rounded-xl border border-blue-100 mb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-3.5 h-3.5 text-blue-500" />
                        <p className="text-[9px] font-black text-blue-600 uppercase">Factura A: ${expense.invoice_amount?.toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => onEdit(expense)}
                      className="flex-1 h-10 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Editar</span>
                    </button>
                    <button 
                      onClick={() => onDelete(expense.id)}
                      className="h-10 w-10 bg-rose-50 hover:bg-rose-100 text-rose-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
