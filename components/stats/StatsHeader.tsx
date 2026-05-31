import React from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, 
  ShoppingBag, PlusCircle 
} from 'lucide-react';

export type Period = 'today' | 'yesterday' | 'week' | 'month';
export type ViewMode = 'business' | 'personal';

interface StatsHeaderProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  selectedMonthDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({
  period, onPeriodChange,
  viewMode, onViewModeChange,
  selectedMonthDate, onPrevMonth, onNextMonth
}) => {
  // Nombres de los meses vecinos, para que las flechas indiquen a dónde llevan
  const prevMonthLabel = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long' });
  const nextMonthLabel = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 1)
    .toLocaleDateString('es-AR', { month: 'long' });

  return (
    <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md pt-2 pb-2 space-y-3">
      {/* 1. Selector de Período con opción AYER */}
      <div className="flex bg-slate-200 p-1 rounded-2xl shadow-sm">
        {(['today', 'yesterday', 'week', 'month'] as Period[]).map(p => (
          <button 
            key={p} 
            onClick={() => onPeriodChange(p)} 
            className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${
              period === p ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'
            }`}
          >
            {p === 'today' ? 'Hoy' : p === 'yesterday' ? 'Ayer' : p === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {/* 2. Navegación Mes (si aplica) */}
      {period === 'month' && (
        <div className="flex items-center justify-between bg-white px-2 py-2 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-top-2">
          <button onClick={onPrevMonth} className="flex items-center gap-1 py-2 pr-2 text-slate-500 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[11px] font-bold capitalize">{prevMonthLabel}</span>
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-black text-xs uppercase tracking-widest text-slate-700">
              {selectedMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button onClick={onNextMonth} className="flex items-center gap-1 py-2 pl-2 text-slate-500 active:scale-90 transition-all">
            <span className="text-[11px] font-bold capitalize">{nextMonthLabel}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 3. Selector Negocio / Personal */}
      <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner mt-2">
        <button 
          onClick={() => onViewModeChange('business')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            viewMode === 'business' ? 'bg-white text-rose-600 shadow-md scale-[1.02]' : 'text-slate-500'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> NEGOCIO
        </button>
        <button 
          onClick={() => onViewModeChange('personal')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            viewMode === 'personal' ? 'bg-white text-pink-600 shadow-md scale-[1.02]' : 'text-slate-500'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" /> PERSONAL
        </button>
      </div>
    </div>
  );
};

export default StatsHeader;