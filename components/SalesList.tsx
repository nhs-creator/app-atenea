
import React, { useMemo, useState, useEffect } from 'react';
import { Sale } from '../types';
import { PAYMENT_METHOD_COLORS } from '../constants';
import { Calendar, Trash2, CheckCircle, AlertCircle, Filter, User, XCircle, ChevronLeft, ChevronRight, CalendarDays, GripHorizontal, ShoppingCart } from 'lucide-react';

interface SalesListProps {
  sales: Sale[];
  onDelete: (id: string) => void;
  onRetrySync: (sale: Sale) => void;
}

type ViewMode = 'month' | 'week' | 'day';

const SalesList: React.FC<SalesListProps> = ({ sales, onDelete, onRetrySync }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterPayment, setFilterPayment] = useState<string>('');
  
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (deleteConfirmId) {
      const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirmId]);

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getEndOfWeek = (date: Date) => {
    const d = getStartOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(anchorDate);
    const multiplier = direction === 'next' ? 1 : -1;
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + multiplier);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (7 * multiplier));
    else newDate.setDate(newDate.getDate() + multiplier);
    setAnchorDate(newDate);
  };

  const formatDateLabel = () => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    if (viewMode === 'month') return anchorDate.toLocaleDateString('es-AR', options).replace(/^\w/, c => c.toUpperCase());
    if (viewMode === 'week') {
      const start = getStartOfWeek(anchorDate);
      const end = getEndOfWeek(anchorDate);
      return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('es-AR', { month: 'short' })}`;
    }
    return anchorDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Fix: Use payment_method instead of paymentMethod
      if (filterPayment && sale.payment_method !== filterPayment) return false;
      const saleDateObj = new Date(sale.date + 'T00:00:00');
      if (viewMode === 'month') return saleDateObj.getMonth() === anchorDate.getMonth() && saleDateObj.getFullYear() === anchorDate.getFullYear();
      if (viewMode === 'week') {
        const start = getStartOfWeek(anchorDate);
        const end = getEndOfWeek(anchorDate);
        return saleDateObj.getTime() >= start.getTime() && saleDateObj.getTime() <= end.getTime();
      }
      if (viewMode === 'day') return sale.date === anchorDate.toISOString().split('T')[0];
      return true;
    });
  }, [sales, filterPayment, viewMode, anchorDate]);

  // Nested Grouping: Date -> Client (DESCENDING)
  const groupedSales = useMemo(() => {
    const dateGroups: { [date: string]: { [client: string]: Sale[] } } = {};
    
    filteredSales.forEach(sale => {
      const date = sale.date;
      // Fix: Use client_number instead of clientNumber
      const client = sale.client_number || 'Sin Cliente';
      
      if (!dateGroups[date]) dateGroups[date] = {};
      if (!dateGroups[date][client]) dateGroups[date][client] = [];
      
      dateGroups[date][client].push(sale);
    });

    // Sort dates descending
    return Object.entries(dateGroups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, clients]) => ({
        date,
        // Sort clients DESCENDING (highest/last number first)
        clients: Object.entries(clients).sort((a, b) => {
          if (a[0] === 'Sin Cliente') return 1;
          if (b[0] === 'Sin Cliente') return -1;
          return parseInt(b[0]) - parseInt(a[0]); // Changed to descending
        }).map(([clientNum, clientSales]) => [
          clientNum, 
          // Sort individual sales by creation time descending (most recent first)
          // Fix: Use created_at instead of createdAt and convert to time for comparison
          clientSales.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())
        ] as [string, Sale[]])
      }));
  }, [filteredSales]);

  const totalInView = filteredSales.reduce((sum, s) => sum + s.price, 0);

  if (sales.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <p>No hay ventas registradas aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Historial</h3>
          <p className="text-xs text-slate-500 font-medium">
            Total período: <span className="text-primary font-bold">${totalInView.toLocaleString('es-AR')}</span>
          </p>
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg transition-colors border shadow-sm ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200'}`}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${viewMode === mode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button onClick={() => navigateDate('prev')} className="p-2 text-slate-500 hover:text-primary"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-bold text-slate-700 text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" />{formatDateLabel()}</span>
            <button onClick={() => navigateDate('next')} className="p-2 text-slate-500 hover:text-primary"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-700">
            <option value="">Todos los medios</option>
            {Object.keys(PAYMENT_METHOD_COLORS).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-8 min-h-[300px]">
        {groupedSales.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-10 opacity-60">
             <GripHorizontal className="w-10 h-10 text-slate-300 mb-2" />
             <p className="text-sm text-slate-500">No hay ventas en este período</p>
           </div>
        ) : (
          groupedSales.map(({ date, clients }) => {
            const dayTotal = clients.reduce((sum, [_, sales]) => sum + sales.reduce((s, val) => s + val.price, 0), 0);
            
            return (
              <div key={date} className="animate-in fade-in">
                <div className="flex justify-between items-center mb-3 px-1 border-b border-slate-200 pb-1">
                  <span className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                    {new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Total día: <span className="text-slate-900">${dayTotal.toLocaleString('es-AR')}</span>
                  </span>
                </div>
                
                <div className="space-y-4">
                  {clients.map(([clientNum, clientSales]) => {
                    const clientTotal = clientSales.reduce((sum, s) => sum + s.price, 0);
                    
                    return (
                      <div key={clientNum} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Client Header */}
                        <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-1 rounded">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-xs font-bold text-slate-700">Cliente: {clientNum}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <ShoppingCart className="w-3 h-3 text-slate-400" />
                             <span className="text-xs font-bold text-slate-900">${clientTotal.toLocaleString('es-AR')}</span>
                          </div>
                        </div>

                        {/* Client Items */}
                        <div className="divide-y divide-slate-50">
                          {clientSales.map((sale) => {
                            // Fix: Use payment_method instead of paymentMethod
                            const colorStyles = PAYMENT_METHOD_COLORS[sale.payment_method] || { bg: 'bg-slate-100', text: 'text-slate-600' };
                            return (
                              <div key={sale.id} className="p-3 flex justify-between items-center group hover:bg-slate-50/50 transition-colors">
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    {/* Fix: Use sale_number instead of saleNumber */}
                                    <span className="text-[10px] font-mono text-slate-400">#{sale.sale_number}</span>
                                    {/* Fix: Use product_name instead of product */}
                                    <h4 className="font-semibold text-slate-800 text-sm truncate">{sale.product_name}</h4>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`${colorStyles.bg} ${colorStyles.text} text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight border border-white/20 shadow-sm`}>
                                      {/* Fix: Use payment_method instead of paymentMethod */}
                                      {sale.payment_method}
                                    </span>
                                    {sale.synced ? (
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <button onClick={() => onRetrySync(sale)} title="Reintentar sincronización" className="text-amber-500 hover:scale-110 transition-transform"><AlertCircle className="w-3 h-3" /></button>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2 pl-2">
                                  <span className="font-bold text-slate-900 text-base">
                                    ${sale.price.toLocaleString('es-AR')}
                                  </span>
                                  
                                  {deleteConfirmId === sale.id ? (
                                    <button onClick={() => { onDelete(sale.id); setDeleteConfirmId(null); }} className="bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1 animate-in zoom-in duration-200">
                                      Confirmar <XCircle className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <button onClick={() => setDeleteConfirmId(sale.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Borrar venta">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
            );
          })
        )}
      </div>
    </div>
  );
};

export default SalesList;
