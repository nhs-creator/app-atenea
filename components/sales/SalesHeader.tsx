import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Trash2, AlertTriangle, CalendarDays } from 'lucide-react';

interface SalesHeaderProps {
  date: string;
  onDateChange: (newDate: string) => void;
  hasItems: boolean;
  onClear: () => void;
  isEdit?: boolean;
  originalClientNumber?: string;
  onCancelEdit: () => void;
}

const SalesHeader: React.FC<SalesHeaderProps> = ({ 
  date, onDateChange, hasItems, onClear, isEdit, originalClientNumber, onCancelEdit 
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const adjustDate = (days: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const quickButtonStyle = "px-3 h-14 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-primary shadow-sm active:scale-90 transition-all flex items-center justify-center uppercase shrink-0";

  return (
    <div className="space-y-3">
      {/* Selector de Fecha y Borrado */}
      <div className="flex items-center gap-2">
        {/* BOTÓN AYER */}
        <button 
          onClick={() => onDateChange(getYesterdayStr())}
          className={quickButtonStyle}
        >
          Ayer
        </button>

        {/* SELECTOR CENTRAL */}
        <div className="flex-1 flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm h-14">
          <button 
            onClick={() => adjustDate(-1)} 
            className="p-2 text-slate-400 active:scale-75 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div 
            onClick={() => dateInputRef.current?.showPicker()} 
            className="flex-1 text-center cursor-pointer flex flex-col justify-center"
          >
            <span className="font-black text-slate-800 text-sm uppercase leading-none">
              {new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}
            </span>
            <input 
              ref={dateInputRef} 
              type="date" 
              value={date} 
              onChange={(e) => onDateChange(e.target.value)} 
              className="sr-only" 
            />
          </div>

          <button 
            onClick={() => adjustDate(1)} 
            className="p-2 text-slate-400 active:scale-75 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* BOTÓN HOY */}
        <button 
          onClick={() => onDateChange(getTodayStr())}
          className={quickButtonStyle}
        >
          Hoy
        </button>

        {/* BOTÓN BORRAR (Solo si hay items y no estamos editando) */}
        {hasItems && !isEdit && (
          <button 
            onClick={onClear}
            className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 active:scale-90 shadow-sm flex items-center justify-center shrink-0"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Banner de Edición */}
      {isEdit && (
        <div className="bg-amber-100 border-2 border-amber-400 p-3 rounded-2xl flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-amber-800 uppercase leading-none">Modo Edición</span>
              <span className="text-[10px] font-bold text-amber-700 opacity-70 uppercase tracking-tighter">{originalClientNumber}</span>
            </div>
          </div>
          <button 
            onClick={onCancelEdit} 
            className="bg-amber-600 text-white px-4 py-2 rounded-xl font-black text-[10px] active:scale-95 shadow-md"
          >
            SALIR
          </button>
        </div>
      )}
    </div>
  );
};

export default SalesHeader;