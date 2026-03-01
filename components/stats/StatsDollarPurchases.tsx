import React from 'react';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface DollarPurchaseItem {
  date: string;
  usd: number;
  ars: number;
  rate: number;
}

interface StatsDollarPurchasesProps {
  items: DollarPurchaseItem[];
  totalUsd: number;
  totalArs: number;
  avgRate: number;
}

const StatsDollarPurchases: React.FC<StatsDollarPurchasesProps> = ({
  items,
  totalUsd,
  totalArs,
  avgRate
}) => {
  const format = (n: number) => n.toLocaleString('es-AR');
  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          Compra de Dólares
        </h3>
        <div className="flex flex-col items-center justify-center py-10 opacity-50">
          <DollarSign className="w-10 h-10 mb-2 text-slate-300" />
          <p className="text-xs text-slate-400 italic">No hay compras de dólares en este período.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-green-500" />
        Compra de Dólares
      </h3>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 min-w-0 overflow-hidden">
          <p className="text-[9px] font-black text-green-600 uppercase tracking-tighter mb-0.5">Total USD</p>
          <p className="text-base font-black text-green-700 truncate" title={format(totalUsd)}>{format(totalUsd)}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 min-w-0 overflow-hidden">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">Total ARS</p>
          <p className="text-xs font-black text-slate-700 truncate" title={`$${format(totalArs)}`}>${format(totalArs)}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 min-w-0 overflow-hidden">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter mb-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 flex-shrink-0" /> Promedio
          </p>
          <p className="text-xs font-black text-amber-700 truncate" title={`$${format(Math.round(avgRate))}/USD`}>${format(Math.round(avgRate))}/USD</p>
        </div>
      </div>

      {/* Lista de compras */}
      <div className="space-y-2">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Por compra</p>
        {items.map((item, idx) => (
          <div
            key={`${item.date}-${item.usd}-${idx}`}
            className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">{item.usd} USD</p>
                <p className="text-[10px] font-bold text-slate-500">{formatDate(item.date)}</p>
              </div>
            </div>
            <div className="text-right min-w-0 flex-shrink-0">
              <p className="text-xs font-black text-slate-700 truncate" title={`$${format(item.ars)}`}>${format(item.ars)}</p>
              <p className="text-[10px] font-bold text-amber-600 truncate" title={`$${format(Math.round(item.rate))}/USD`}>${format(Math.round(item.rate))}/USD</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsDollarPurchases;
