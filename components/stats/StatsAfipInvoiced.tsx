import React from 'react';
import { FileBarChart } from 'lucide-react';

interface StatsAfipInvoicedProps {
  yearMonth: string;
  monthLabel: string;
  total: number;
  count: number;
}

const StatsAfipInvoiced: React.FC<StatsAfipInvoicedProps> = ({ monthLabel, total, count }) => {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-5 flex items-center justify-between animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-violet-50 text-violet-600 shrink-0">
          <FileBarChart className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.15em]">
            Facturado AFIP (real)
          </p>
          <p className="text-xs font-bold text-slate-400 capitalize">{monthLabel}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-black text-slate-800 tracking-tighter">
          ${Math.round(total).toLocaleString('es-AR')}
        </p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
          {count > 0 ? `${count} comprobante${count === 1 ? '' : 's'}` : 'sin comprobantes'}
        </p>
      </div>
    </div>
  );
};

export default StatsAfipInvoiced;
