import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatSelectorDate } from '../../lib/dateLabels';

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

interface DaySelectorProps {
  date: string;
  onDateChange: (newDate: string) => void;
  showQuickButtons?: boolean;
  className?: string;
}

const DaySelector: React.FC<DaySelectorProps> = ({ date, onDateChange, showQuickButtons = true, className }) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const adjustDate = (days: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const quickButtonStyle = "px-3 h-14 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-primary shadow-sm active:scale-90 transition-all flex items-center justify-center uppercase shrink-0";

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {showQuickButtons && (
        <button onClick={() => onDateChange(getYesterdayStr())} className={quickButtonStyle}>
          Ayer
        </button>
      )}

      <div className="flex-1 flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm h-14">
        <button onClick={() => adjustDate(-1)} className="p-2 text-slate-400 active:scale-75 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div onClick={() => dateInputRef.current?.showPicker()} className="flex-1 text-center cursor-pointer flex flex-col justify-center">
          <span className="font-black text-slate-800 text-sm uppercase leading-none">
            {formatSelectorDate(new Date(date + 'T12:00:00'))}
          </span>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="sr-only"
          />
        </div>

        <button onClick={() => adjustDate(1)} className="p-2 text-slate-400 active:scale-75 transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {showQuickButtons && (
        <button onClick={() => onDateChange(getTodayStr())} className={quickButtonStyle}>
          Hoy
        </button>
      )}
    </div>
  );
};

export default DaySelector;
