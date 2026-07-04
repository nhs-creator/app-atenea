import React, { useMemo } from 'react';
import { Expense, ExpenseCategory } from '../types';
import {
  Receipt, Calendar, Edit3, Trash2
} from 'lucide-react';
import { CATEGORY_METADATA } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import SearchBar from './ui/SearchBar';
import ListCard from './ui/ListCard';

interface ExpenseListProps {
  expenses: Expense[];
  date: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, date, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useLocalStorage('atenea_expense_list_search', '');

  // --- Lógica de Filtrado ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (exp.date !== date) return false;

      const matchesSearch =
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [expenses, date, searchTerm]);

  // --- Totales del Mes ---
  const totalMes = useMemo(() => 
    filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  , [filteredExpenses]);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      {/* Buscador y Resumen */}
      <div className="px-1 space-y-2">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por descripción o categoría..." focusColorClass="focus:border-rose-400" />

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
              <ListCard key={expense.id}>
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
                      onClick={() => { if (window.confirm('¿BORRAR GASTO?')) onDelete(expense.id); }}
                      className="h-10 w-10 bg-rose-50 hover:bg-rose-100 text-rose-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </ListCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
