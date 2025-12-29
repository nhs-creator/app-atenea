
import React, { useState, useMemo } from 'react';
import { Expense, ExpenseFormData, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS } from '../constants';
import { Plus, Receipt, Trash2, AlertCircle, CheckCircle, Package, Home, Tag, FileText, Percent } from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  onSubmit: (data: ExpenseFormData) => void;
  onDelete: (id: string) => void;
  onRetrySync: (expense: Expense) => void;
}

const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, onSubmit, onDelete, onRetrySync }) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'Mercadería',
    hasInvoiceA: false,
    invoicePercentage: '100'
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;
    onSubmit(formData);
    setFormData({
      ...formData,
      description: '',
      amount: '',
      hasInvoiceA: false,
      invoicePercentage: '100'
    });
  };

  const sortedExpenses = useMemo(() => {
    // Fix: Use created_at instead of createdAt and convert to time for comparison
    return [...expenses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [expenses]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'Mercadería': return <Package className="w-4 h-4" />;
      case 'Alquiler/Fijos': return <Home className="w-4 h-4" />;
      case 'Impuestos/Servicios': return <Receipt className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold text-slate-800">Gastos</h2>
        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm font-bold border border-rose-200">
          Total: ${totalExpenses.toLocaleString('es-AR')}
        </div>
      </div>

      {/* Expense Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full h-10 px-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium active:scale-[0.98]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as ExpenseCategory})}
                className="w-full h-10 px-2 rounded-lg border border-slate-200 bg-white text-sm font-medium active:scale-[0.98]"
              >
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Proveedor</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Ej: Mayorista Avellaneda"
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-rose-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12">
               <label className="block text-xs font-bold text-slate-700 mb-1">Monto Total</label>
               <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="text" inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value.replace(/[^\d.]/g, '')})}
                  placeholder="0"
                  className="w-full h-11 pl-7 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold text-rose-600 outline-none focus:border-rose-500 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${formData.hasInvoiceA ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-400'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-700">¿Hizo Factura A?</span>
              </div>
              <button
                type="button"
                onClick={() => setFormData({...formData, hasInvoiceA: !formData.hasInvoiceA})}
                className={`w-12 h-6 rounded-full transition-colors relative active:scale-95 ${formData.hasInvoiceA ? 'bg-primary' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.hasInvoiceA ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {formData.hasInvoiceA && (
              <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-200 pt-2 border-t border-slate-200/50">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Porcentaje Facturado</label>
                  <div className="relative">
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                      type="text" inputMode="numeric"
                      value={formData.invoicePercentage}
                      onChange={(e) => setFormData({...formData, invoicePercentage: e.target.value.replace(/\D/g, '')})}
                      className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium italic w-24">
                  Especifíca qué % del total te facturaron.
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all flex justify-center items-center gap-2">
            <Plus className="w-5 h-5" /> Registrar Gasto
          </button>
        </form>
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">Últimos Egresos</h3>
        {sortedExpenses.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">No hay gastos registrados</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {sortedExpenses.map((expense) => {
              const colorInfo = EXPENSE_CATEGORY_COLORS[expense.category];
              return (
                <div key={expense.id} className="p-4 flex justify-between items-center group hover:bg-slate-50 transition-colors active:bg-slate-50">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`${colorInfo.bg} ${colorInfo.iconColor} p-1.5 rounded-lg`}>
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{expense.description}</h4>
                          {/* Fix: Use has_invoice_a instead of hasInvoiceA */}
                          {expense.has_invoice_a && (
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-100 flex-shrink-0">
                              <FileText className="w-2.5 h-2.5" />
                              {/* Fix: Use invoice_percentage instead of invoicePercentage */}
                              A {expense.invoice_percentage}%
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(expense.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${colorInfo.bg} ${colorInfo.text}`}>
                            {expense.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-rose-600 text-lg leading-tight">
                      -${expense.amount.toLocaleString('es-AR')}
                    </span>
                    <div className="flex items-center gap-2">
                      {expense.synced ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <button onClick={() => onRetrySync(expense)} className="text-amber-500 hover:scale-125 transition-transform"><AlertCircle className="w-3 h-3" /></button>
                      )}
                      {deleteConfirmId === expense.id ? (
                        <button onClick={() => { onDelete(expense.id); setDeleteConfirmId(null); }} className="text-white bg-red-500 px-2 py-0.5 rounded text-[10px] font-bold active:scale-90 transition-transform">
                          Ok
                        </button>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(expense.id)} className="text-slate-300 hover:text-red-500 transition-colors active:scale-90">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesView;
