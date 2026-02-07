import React, { useMemo, useState, useEffect } from 'react';
import { Sale } from '../types';
import { 
  Calendar, Package, Trash2, Edit3, 
  RefreshCcw, CheckCircle2, AlertCircle, Search, 
  ChevronLeft, ChevronRight, X, Percent, Coins
} from 'lucide-react';

interface SalesListProps {
  sales: Sale[];
  onDelete: (clientNumber: string) => void;
  onEdit: (sale: Sale) => void;
  onReturn: (sale: Sale) => void;
}

const ITEMS_PER_PAGE = 15;

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

const SalesList: React.FC<SalesListProps> = ({ sales, onDelete, onEdit, onReturn }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonthDate, searchTerm]);

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
  const filteredSales = useMemo(() => {
    const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
    const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);

    return sales.filter(sale => {
      const saleDate = new Date(sale.date + 'T12:00:00');
      const isInMonth = saleDate >= startOfMonth && saleDate <= endOfMonth;
      if (!isInMonth) return false;

      const matchesSearch = 
        sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.client_number.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [sales, selectedMonthDate, searchTerm]);

  // --- Agrupamiento y Paginación ---
  const groupedSales = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    filteredSales.forEach(sale => {
      if (!groups[sale.client_number]) groups[sale.client_number] = [];
      groups[sale.client_number].push(sale);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredSales]);

  const totalPages = Math.ceil(groupedSales.length / ITEMS_PER_PAGE);
  const paginatedGroups = groupedSales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-4 pb-24">
      {/* 1. SELECTOR DE MES (PAGINACIÓN TEMPORAL) */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm sticky top-0 z-30">
        <button onClick={handlePrevMonth} className="p-3 text-slate-400 active:scale-75 transition-all"><ChevronLeft className="w-6 h-6" /></button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Historial de</span>
          <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
            {selectedMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button onClick={handleNextMonth} className="p-3 text-slate-400 active:scale-75 transition-all"><ChevronRight className="w-6 h-6" /></button>
      </div>

      {/* 2. BUSCADOR */}
      <div className="px-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input 
          type="text" 
          placeholder="Buscar venta..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border-2 border-slate-100 shadow-sm font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tighter" 
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400"><X className="w-3 h-3" /></button>
        )}
      </div>

      {/* 3. LISTADO DE VENTAS */}
      {paginatedGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-3xl border-2 border-dashed border-slate-50">
          <Package className="w-12 h-12 mb-2 opacity-20" />
          <p className="font-black text-[10px] uppercase tracking-[0.2em]">Sin movimientos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedGroups.map(([clientNumber, items]) => {
            const firstSale = items[0];
            const isPending = firstSale.status === 'pending';
            const isReturnTransaction = clientNumber.startsWith('C');
            const status = isReturnTransaction ? STATUS_CONFIG.cambio : isPending ? STATUS_CONFIG.sena : STATUS_CONFIG.saldado;

            // Lógica de Desglose
            const realProducts = items.filter(i => i.product_name !== '💰 AJUSTE POR REDONDEO');
            const roundingAdjustment = items.find(i => i.product_name === '💰 AJUSTE POR REDONDEO');
            
            const totalCobrado = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

            let totalDescuento10 = 0;
            realProducts.forEach(p => {
              const unitPrice = Number(p.price);
              const unitListPrice = Number(p.list_price) || unitPrice;
              if (unitListPrice > unitPrice) totalDescuento10 += (unitListPrice - unitPrice) * p.quantity;
            });

            return (
              <div key={clientNumber} className={`${status.bg} rounded-[2rem] shadow-md border-2 ${status.border} overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                {/* CABECERA (Colores y Estados) */}
                <div className="p-4 flex justify-between items-center bg-white/40 border-b border-white/60">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl shadow-sm bg-white ${status.text}`}><status.icon className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-400 leading-tight uppercase tracking-widest">{clientNumber}</h3>
                      <div className="flex items-center gap-1.5 text-base font-black text-slate-700 mt-0.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        {new Date(firstSale.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black leading-none tracking-tighter ${totalCobrado < 0 ? 'text-indigo-600' : 'text-slate-900'}`}>
                      ${Math.abs(totalCobrado).toLocaleString('es-AR')}
                    </p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase mt-1 inline-block bg-white border ${status.border} ${status.text}`}>{status.label}</span>
                  </div>
                </div>

                {/* LISTA DE ARTÍCULOS */}
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

                  {/* DESCUENTOS Y REDONDEO (JERARQUÍA RESTAURADA) */}
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

                {/* MEDIOS DE PAGO (COLORES RESTAURADOS) */}
                {firstSale.payment_details && firstSale.payment_details.length > 0 && (
                  <div className="px-4 py-3 flex flex-wrap gap-2 bg-white/20 border-t border-white/40">
                    {firstSale.payment_details.map((p, i) => (
                      <div key={i} className={`${PAYMENT_COLORS[p.method] || 'bg-slate-400'} px-2.5 py-1 rounded-lg flex items-center gap-2 shadow-sm`}>
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter">{p.method}</span>
                        <span className="text-[10px] font-black text-white">${p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div className="p-2 grid grid-cols-3 gap-2 bg-white/60">
                  <button onClick={() => { if(window.confirm('¿BORRAR VENTA?')) onDelete(clientNumber); }} className="h-11 bg-white text-rose-500 rounded-2xl flex items-center justify-center gap-2 border-2 border-rose-100 shadow-sm active:scale-90 transition-all"><Trash2 className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Borrar</span></button>
                  <button onClick={() => onEdit(firstSale)} className="h-11 bg-white text-slate-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-slate-100 shadow-sm active:scale-90 transition-all"><Edit3 className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Corregir</span></button>
                  <button onClick={() => onReturn(firstSale)} className="h-11 bg-white hover:bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-indigo-100 shadow-sm active:scale-90 transition-all"><RefreshCcw className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Cambio</span></button>
                </div>
              </div>
            );
          })}

          {/* BOTONERA DE PÁGINAS */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 pt-6 pb-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border-2 border-slate-100 text-slate-400 disabled:opacity-30 active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
                <span className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase">Página {currentPage} de {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border-2 border-slate-100 text-slate-400 disabled:opacity-30 active:scale-90"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesList;