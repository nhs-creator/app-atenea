import React from 'react';
import { Wallet } from 'lucide-react';

interface StatsConsolidatedProps {
  totalSales: number;
  businessExpenses: number;
  netProfit: number;
  personalWithdrawals: number;
  finalBalance: number;
}

const StatsConsolidated: React.FC<StatsConsolidatedProps> = ({
  totalSales, businessExpenses, netProfit, personalWithdrawals, finalBalance
}) => {
  const format = (num: number) => num.toLocaleString('es-AR');

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 -mr-10 -mt-10 rounded-full blur-3xl"></div>
      <div className="relative z-10 space-y-4">

        {/* Entradas y salidas del negocio */}
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-3">
            <span className="text-base text-slate-300 font-bold">Ventas</span>
            <span className="text-xl text-white font-black whitespace-nowrap">${format(totalSales)}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-base text-slate-300 font-bold">Gastos del negocio</span>
            <span className="text-xl text-rose-300 font-black whitespace-nowrap">-${format(businessExpenses)}</span>
          </div>
        </div>

        {/* Resultado 1: Ganancia del negocio */}
        <div className="border-t border-white/10 pt-4">
          <p className="text-sm font-black text-slate-200 uppercase tracking-[0.15em]">
            Ganancia del negocio
          </p>
          <p className={`text-4xl font-black tracking-tighter ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${format(netProfit)}
          </p>
        </div>

        {/* Retiro personal */}
        <div className="flex justify-between items-center gap-3 border-t border-white/10 pt-4">
          <span className="text-base text-slate-300 font-bold">Lo que sacaste</span>
          <span className="text-xl text-rose-300 font-black whitespace-nowrap">-${format(personalWithdrawals)}</span>
        </div>

        {/* Resultado 2: Te quedó en caja (el número más importante) */}
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-emerald-300" />
            <span className="text-sm font-black text-slate-200 uppercase tracking-[0.15em]">
              Te quedó en caja
            </span>
          </div>
          <p className={`text-5xl font-black tracking-tighter ${finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {finalBalance < 0 ? '-' : ''}${format(Math.abs(finalBalance))}
          </p>
        </div>

      </div>
    </div>
  );
};

export default StatsConsolidated;
