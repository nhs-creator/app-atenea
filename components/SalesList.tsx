import React, { useMemo, useState } from 'react';
import { Sale } from '../types';
import { PAYMENT_METHOD_COLORS } from '../constants';
import { 
  Trash2, Edit2, Filter, 
  ChevronLeft, ChevronRight, CalendarDays, 
  ShoppingCart, AlertCircle, RefreshCcw
} from 'lucide-react';

interface SalesListProps {
  sales: Sale[];
  onDelete: (id: string) => void;
  onEdit: (sale: Sale) => void;
  onReturn: (sale: Sale) => void;
}

type ViewMode = 'month' | 'day';

const SalesList: React.FC<SalesListProps> = ({ sales, onDelete, onEdit, onReturn }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterPayment, setFilterPayment] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(anchorDate);
    const multiplier = direction === 'next' ? 1 : -1;
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + multiplier);
    else newDate.setDate(newDate.getDate() + multiplier);
    setAnchorDate(newDate);
  };

  const formatDateLabel = () => {
    if (viewMode === 'month') return anchorDate.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase());
    return anchorDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      if (filterPayment && sale.payment_method !== filterPayment) return false;
      const saleDateObj = new Date(sale.date + 'T00:00:00');
      if (viewMode === 'month') return saleDateObj.getMonth() === anchorDate.getMonth() && saleDateObj.getFullYear() === anchorDate.getFullYear();
      if (viewMode === 'day') return sale.date === anchorDate.toISOString().split('T')[0];
      return true;
    });
  }, [sales, filterPayment, viewMode, anchorDate]);

  const groupedSales = useMemo(() => {
    const dateGroups: { [date: string]: { [client: string]: Sale[] } } = {};
    filteredSales.forEach(sale => {
      const date = sale.date;
      const client = sale.client_number;
      if (!dateGroups[date]) dateGroups[date] = {};
      if (!dateGroups[date][client]) dateGroups[date][client] = [];
      dateGroups[date][client].push(sale);
    });

    return Object.entries(dateGroups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, clients]) => ({
        date,
        clients: Object.entries(clients).sort((a, b) => b[0].localeCompare(a[0]))
      }));
  }, [filteredSales]);

  const totalInView = filteredSales.reduce((sum, s) => sum + Number(s.price), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="font-black text-slate-900 text-xl tracking-tight">Historial</h3>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Total: <span className="text-primary">${totalInView.toLocaleString('es-AR')}</span></p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all ${showFilters ? 'bg-primary border-primary text-white' : 'bg-white border-slate-300 text-slate-500'}`}><Filter className="w-6 h-6" /></button>
      </div>

      {showFilters && (
        <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-200 shadow-xl space-y-4 animate-in slide-in-from-top-2">
          <div className="flex bg-slate-100 p-1.5 rounded-xl">
            {(['month', 'day'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 py-2 text-xs font-black rounded-lg uppercase transition-all ${viewMode === mode ? 'bg-white text-primary shadow-md' : 'text-slate-500'}`}>{mode === 'month' ? 'Mes' : 'Día'}</button>
            ))}
          </div>
          <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-200 rounded-2xl p-1">
            <button onClick={() => navigateDate('prev')} className="w-12 h-12 flex items-center justify-center text-slate-600"><ChevronLeft /></button>
            <span className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-tight">{formatDateLabel()}</span>
            <button onClick={() => navigateDate('next')} className="w-12 h-12 flex items-center justify-center text-slate-600"><ChevronRight /></button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {groupedSales.map(({ date, clients }) => (
          <div key={date}>
            <div className="mb-4 px-1 border-b-2 border-slate-200 pb-2">
              <span className="font-black text-slate-900 text-xs uppercase tracking-[0.2em]">{new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="space-y-5">
              {clients.map(([clientNum, clientSales]) => {
                const clientTotal = clientSales.reduce((sum, s) => sum + Number(s.price), 0);
                return (
                  <div key={clientNum} className="bg-white rounded-[1.5rem] shadow-lg border-2 border-slate-300 overflow-hidden">
                    <div className="bg-slate-900 px-4 py-3 flex justify-between items-center">
                      <span className="text-sm font-black text-primary tracking-widest uppercase">{clientNum}</span>
                      <span className="text-base font-black text-white">${clientTotal.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="divide-y-2 divide-slate-100">
                      {clientSales.map((sale) => {
                        const colorStyles = PAYMENT_METHOD_COLORS[sale.payment_method] || { bg: 'bg-slate-100', text: 'text-slate-900' };
                        const isReturn = Number(sale.price) < 0;
                        return (
                          <div key={sale.id} className="p-4 flex justify-between items-center">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="flex items-center gap-2 mb-1">
                                {isReturn && <span className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Devolución</span>}
                                <h4 className="font-black text-slate-900 text-base leading-tight uppercase truncate">{sale.product_name}</h4>
                              </div>
                              <span className={`${colorStyles.bg} ${colorStyles.text} text-[10px] px-2.5 py-1 rounded-md font-black uppercase border-2 border-black/10`}>{sale.payment_method}</span>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                              <span className={`font-black text-lg tracking-tighter ${isReturn ? 'text-rose-600' : 'text-slate-900'}`}>
                                {isReturn ? '-' : ''}${Math.abs(Number(sale.price)).toLocaleString('es-AR')}
                              </span>
                              <div className="flex gap-1.5">
                                <button onClick={() => onReturn(sale)} className="w-11 h-11 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl border-2 border-indigo-100 active:scale-95 transition-all shadow-sm"><RefreshCcw className="w-5 h-5" /></button>
                                <button onClick={() => onEdit(sale)} className="w-11 h-11 flex items-center justify-center bg-slate-100 text-slate-700 rounded-xl border-2 border-slate-200 active:scale-95 transition-all shadow-sm"><Edit2 className="w-5 h-5" /></button>
                                <button onClick={() => onDelete(sale.id)} className="w-11 h-11 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl border-2 border-rose-200 active:scale-95 transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesList;