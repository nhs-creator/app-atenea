import React from 'react';
import { ArrowDownCircle, Receipt } from 'lucide-react';
import { ExpenseCategory } from '../../types';
import { CATEGORY_METADATA } from '../../constants';

interface StatsBreakdownProps {
  viewMode: 'business' | 'personal';
  topExpenses: { name: string, value: number }[];
  totalExpenses: number;
}

const StatsBreakdown: React.FC<StatsBreakdownProps> = ({ 
  viewMode, topExpenses, totalExpenses 
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <ArrowDownCircle className={`w-4 h-4 ${viewMode === 'business' ? 'text-rose-500' : 'text-pink-500'}`} /> 
        Distribución de Gastos
      </h3>
      
      {topExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 opacity-50">
          <Receipt className="w-8 h-8 mb-2 text-slate-300" />
          <p className="text-xs text-slate-400 italic">No hay gastos en este período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topExpenses.map(({ name, value }) => {
            const meta = CATEGORY_METADATA[name as ExpenseCategory];
            const Icon = meta?.icon || Receipt;
            const percentage = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;

            return (
              <div key={name} className="flex items-center justify-between animate-in fade-in duration-500">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${meta?.styles.bg || 'bg-slate-100'} ${meta?.styles.iconColor || 'text-slate-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-700">{name}</p>
                    <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${viewMode === 'business' ? 'bg-rose-400' : 'bg-pink-400'}`} 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-black text-slate-600">-${value.toLocaleString('es-AR')}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StatsBreakdown;