import React from 'react';
import { Wallet } from 'lucide-react';

interface StatsFinalBalanceProps {
  finalBalance: number;
  totalSales: number;
  businessExpenses: number;
  personalWithdrawals: number;
}

const StatsFinalBalance: React.FC<StatsFinalBalanceProps> = ({
  finalBalance, totalSales, businessExpenses, personalWithdrawals
}) => {
  const format = (num: number) => num.toLocaleString('es-AR');
  const positive = finalBalance >= 0;

  return (
    <div className={`rounded-[2.5rem] p-7 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500 ${
      positive ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'
    }`}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 -mr-10 -mt-10 rounded-full blur-3xl"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <Wallet className="w-6 h-6" />
          <span className="text-xs font-black uppercase tracking-[0.15em]">Te quedó en caja</span>
        </div>
        <p className="text-5xl font-black tracking-tighter mb-3">
          {positive ? '' : '-'}${format(Math.abs(finalBalance))}
        </p>

        <div className="border-t border-white/20 pt-3 space-y-1">
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="opacity-80">Ventas</span>
            <span>${format(totalSales)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="opacity-80">Gastos del negocio</span>
            <span>-${format(businessExpenses)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="opacity-80">Lo que sacaste para vos</span>
            <span>-${format(personalWithdrawals)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsFinalBalance;
