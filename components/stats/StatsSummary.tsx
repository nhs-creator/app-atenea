import React from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, User, 
  ShoppingBag, Landmark, Banknote, Smartphone, Ticket 
} from 'lucide-react';

interface StatsSummaryProps {
  viewMode: 'business' | 'personal';
  metrics: {
    netProfit: number;
    totalSales: number;
    businessExpenses: number;
    personalWithdrawals: number;
    finalBalance: number;
  };
}

const StatsSummary: React.FC<StatsSummaryProps> = ({ viewMode, metrics }) => {
  const format = (num: number) => num.toLocaleString('es-AR');

  if (viewMode === 'business') {
    return (
      <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/20 -mr-10 -mt-10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <p className="text-xs font-black text-slate-300 uppercase tracking-[0.15em] mb-1">
            Ganancia Operativa (Ventas - Gastos)
          </p>
          <p className={`text-4xl font-black tracking-tighter mb-4 ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${format(metrics.netProfit)}
          </p>
          
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ArrowUpCircle className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-tight">Ventas</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">${format(metrics.totalSales)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400">
                <ArrowDownCircle className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-tight">Gastos Negocio</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">${format(metrics.businessExpenses)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista Personal
  return (
    <div className="bg-pink-600 rounded-[2.5rem] p-7 text-white shadow-2xl shadow-pink-200 relative overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 -mr-10 -mt-10 rounded-full blur-3xl"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 opacity-80">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Retiros Totales</span>
        </div>
        <p className="text-5xl font-black tracking-tighter mb-2">-${format(metrics.personalWithdrawals)}</p>
        <p className="text-[10px] font-bold text-pink-100 opacity-70">
          Dinero retirado de la caja del negocio para uso personal.
        </p>
      </div>
    </div>
  );
};

export default StatsSummary;