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
          <button onClick={onPrevMonth} className="p-2 text-slate-400 active:scale-75 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-black text-xs uppercase tracking-widest text-slate-700">
              {selectedMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button onClick={onNextMonth} className="p-2 text-slate-400 active:scale-75 transition-all">
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