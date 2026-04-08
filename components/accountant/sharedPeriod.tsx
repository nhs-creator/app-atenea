import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export type PeriodMode = 'month' | 'ytd' | 'all';

const labels: Record<PeriodMode, string> = {
  month: 'Mes',
  ytd: 'Año',
  all: 'Todo',
};

const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function getPeriodRange(
  mode: PeriodMode,
  selectedMonth: Date
): { from: string; to: string } {
  if (mode === 'month') {
    const y = selectedMonth.getFullYear();
    const m = selectedMonth.getMonth();
    return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
  }
  if (mode === 'ytd') {
    const y = selectedMonth.getFullYear();
    return { from: fmt(new Date(y, 0, 1)), to: fmt(new Date(y, 11, 31)) };
  }
  return { from: '0000-00-00', to: '9999-99-99' };
}

export function getPeriodLabel(mode: PeriodMode, selectedMonth: Date): string {
  if (mode === 'month') {
    return selectedMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }
  if (mode === 'ytd') {
    return `Año ${selectedMonth.getFullYear()}`;
  }
  return 'Histórico';
}

interface Props {
  mode: PeriodMode;
  selectedMonth: Date;
  onModeChange: (m: PeriodMode) => void;
  onMonthChange: (d: Date) => void;
}

export const PeriodSelector: React.FC<Props> = ({
  mode,
  selectedMonth,
  onModeChange,
  onMonthChange,
}) => {
  const handlePrev = () => {
    const d = new Date(selectedMonth);
    if (mode === 'ytd') {
      d.setFullYear(d.getFullYear() - 1);
    } else {
      // month or all (when 'all', clicking arrows still navigates the cursor)
      d.setMonth(d.getMonth() - 1);
    }
    onMonthChange(d);
    if (mode === 'all') onModeChange('month');
  };

  const handleNext = () => {
    const d = new Date(selectedMonth);
    if (mode === 'ytd') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    onMonthChange(d);
    if (mode === 'all') onModeChange('month');
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period chips */}
      <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
        {(Object.keys(labels) as PeriodMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${
              mode === m ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'
            }`}
          >
            {labels[m]}
          </button>
        ))}
      </div>

      {/* Navigator (hidden in 'all' mode) */}
      {mode !== 'all' && (
        <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded-2xl border-2 border-slate-100 shadow-sm gap-1 animate-in slide-in-from-left-2 duration-300">
          <button
            onClick={handlePrev}
            className="p-2 text-slate-400 hover:text-primary active:scale-75 transition-all"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-black text-xs uppercase tracking-widest text-slate-700 capitalize whitespace-nowrap">
              {getPeriodLabel(mode, selectedMonth)}
            </span>
          </div>
          <button
            onClick={handleNext}
            className="p-2 text-slate-400 hover:text-primary active:scale-75 transition-all"
            aria-label="Período siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
