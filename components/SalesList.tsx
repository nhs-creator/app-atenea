import React, { useMemo, useState } from 'react';
import { Sale } from '../types';
import { 
  Calendar, Package, Trash2, Edit3, 
  RefreshCcw, CheckCircle2, AlertCircle, Search, Filter, X,
  Percent, Coins
} from 'lucide-react';

interface SalesListProps {
  sales: Sale[];
  onDelete: (clientNumber: string) => void;
  onEdit: (sale: Sale) => void;
  onReturn: (sale: Sale) => void;
}

const PAYMENT_COLORS: Record<string, string> = {
  'Efectivo': 'bg-emerald-500',
  'Transferencia': 'bg-blue-600',
  'Débito': 'bg-amber-500',
  'Crédito': 'bg-rose-600',
  'Vale': 'bg-orange-600'
};

const STATUS_CONFIG = {
  saldado: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Saldado' },
  sena: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertCircle, label: 'Seña' },
  cambio: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: RefreshCcw, label: 'Cambio' }
};

type Period = 'all' | 'today' | 'week' | 'month';

const SalesList: React.FC<SalesListProps> = ({ sales, onDelete, onEdit, onReturn }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = 
        sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.client_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.payment_method || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (period === 'all') return true;
      const saleDate = new Date(sale.date + 'T12:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (period === 'today') return sale.date === now.toISOString().split('T')[0];
      if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return saleDate >= weekAgo;
      }
      if (period === 'month') return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      return true;
    });
  }, [sales, searchTerm, period]);

  const groupedSales = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    filteredSales.forEach(sale => {
      if (!groups[sale.client_number]) groups[sale.client_number] = [];
      groups[sale.client_number].push(sale);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredSales]);

  return (
    <div className="space-y-4 pb-24">
      {/* BUSCADOR */}
      <div className="sticky top-0 z-30 bg-slate-50 pt-2 pb-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar venta o producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-11 pr-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tighter" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400"><X className="w-3 h-3" /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${showFilters || period !== 'all' ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 shadow-sm'}`}><Filter className="w-5 h-5" /></button>
        </div>
        {(showFilters || period !== 'all') && (
          <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300 overflow-x-auto pb-1 px-1">
            {['today', 'week', 'month', 'all'].map(p => (
              <button key={p} onClick={() => setPeriod(p as Period)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${period === p ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                {p === 'all' ? <Filter className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Todo'}
              </button>
            ))}
          </div>
        )}
      </div>

      {groupedSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100"><Package className="w-12 h-12 mb-4 opacity-20" /><p className="font-bold">Sin resultados</p></div>
      ) : (
        groupedSales.map(([clientNumber, items]) => {
          const firstSale = items[0];
          const isPending = firstSale.status === 'pending';
          const isReturnTransaction = clientNumber.startsWith('C');
          const status = isReturnTransaction ? STATUS_CONFIG.cambio : isPending ? STATUS_CONFIG.sena : STATUS_CONFIG.saldado;

          const realProducts = items.filter(i => i.product_name !== '💰 AJUSTE POR REDONDEO');
          const roundingAdjustment = items.find(i => i.product_name === '💰 AJUSTE POR REDONDEO');
          
          const totalCobrado = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

          let totalDescuento10 = 0;
          realProducts.forEach(p => {
            const unitPrice = Number(p.price);
            const unitListPrice = Number(p.list_price) || unitPrice;
            if (unitListPrice > unitPrice) {
              totalDescuento10 += (unitListPrice - unitPrice) * p.quantity;
            }
          });

          return (
            <div key={clientNumber} className={`${status.bg} rounded-[2rem] shadow-sm border-2 ${status.border} overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-3 duration-500`}>
              {/* CABECERA */}
              <div className="p-4 flex justify-between items-center bg-white/40 border-b border-white/60">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl shadow-sm bg-white ${status.text}`}><status.icon className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-[11px] font-black text-slate-400 leading-tight uppercase tracking-widest">{clientNumber}</h3>
                    <div className="flex items-center gap-1.5 text-sm font-black text-slate-700 mt-0.5"><Calendar className="w-4 h-4 text-primary" />{new Date(firstSale.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}</div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black leading-none ${totalCobrado < 0 ? 'text-indigo-600' : 'text-slate-900'} tracking-tighter`}>${Math.abs(totalCobrado).toLocaleString('es-AR')}</p>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase mt-1 inline-block bg-white border ${status.border} ${status.text}`}>{status.label}</span>
                </div>
              </div>

              {/* LISTA DE PRODUCTOS */}
              <div className="px-4 py-3 space-y-2">
                {realProducts.map(item => {
                  const unitPrice = Number(item.price);
                  const unitListPrice = Number(item.list_price) || unitPrice;
                  const has10 = unitListPrice > unitPrice;
                  const lineTotal = unitPrice * item.quantity;
                  const lineListTotal = unitListPrice * item.quantity;

                  return (
                    <div key={item.id} className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span className="truncate uppercase pr-4">
                        {item.quantity > 1 && <span className="text-primary mr-1">{item.quantity}x</span>}
                        {item.product_name} <span className="text-[9px] text-slate-400 font-black ml-1">({item.size || 'U'})</span>
                      </span>
                      <div className="text-right flex flex-col items-end">
                        {has10 && <span className="text-[9px] text-slate-300 line-through">${lineListTotal.toLocaleString()}</span>}
                        <span className={`font-black ${has10 ? 'text-emerald-500' : 'text-slate-800'}`}>${Math.abs(lineTotal).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}

                {(totalDescuento10 > 0 || roundingAdjustment) && (
                  <div className="mt-3 pt-3 border-t border-dashed border-white/60 space-y-1.5">
                    {totalDescuento10 > 0 && (
                      <div className="flex justify-between items-center text-[10px] font-black text-emerald-600 uppercase tracking-tighter italic">
                        <div className="flex items-center gap-1"><Percent className="w-3 h-3" /> Descuento 10%</div>
                        <span>-${totalDescuento10.toLocaleString()}</span>
                      </div>
                    )}
                    {roundingAdjustment && (
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                        <div className="flex items-center gap-1"><Coins className="w-3 h-3" /> Redondeo</div>
                        <span>-${Math.abs(Number(roundingAdjustment.price)).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MEDIOS DE PAGO */}
              {firstSale.payment_details && firstSale.payment_details.length > 0 && (
                <div className="px-4 py-3 flex flex-wrap gap-2 bg-white/20 border-t border-white/40">
                  {firstSale.payment_details.map((p, i) => (
                    <div key={i} className={`${PAYMENT_COLORS[p.method] || 'bg-slate-400'} px-2.5 py-1 rounded-lg flex items-center gap-2 shadow-sm`}><span className="text-[8px] font-black text-white uppercase tracking-tighter">{p.method}</span><span className="text-[10px] font-black text-white">${p.amount.toLocaleString()}</span></div>
                  ))}
                </div>
              )}

              {/* BOTONES DE ACCIÓN (CON CONFIRMACIÓN EN BORRAR) */}
              <div className="p-2 grid grid-cols-3 gap-2 bg-white/60">
                <button 
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de que quieres borrar TODA la venta ${clientNumber}? Esta acción restaurará el stock y no se puede deshacer.`)) {
                      onDelete(clientNumber);
                    }
                  }} 
                  className="h-11 bg-white hover:bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center gap-2 border-2 border-rose-100 shadow-sm active:scale-90 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase">Borrar</span>
                </button>
                <button onClick={() => onEdit(firstSale)} className="h-11 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-slate-100 shadow-sm active:scale-90 transition-all"><Edit3 className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Corregir</span></button>
                <button onClick={() => onReturn(firstSale)} className="h-11 bg-white hover:bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-indigo-100 shadow-sm active:scale-90 transition-all"><RefreshCcw className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Cambio</span></button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default SalesList;