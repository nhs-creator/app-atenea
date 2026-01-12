import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';

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

  const adjustDate = (days: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-3">
      {/* Selector de Fecha y Borrado */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => adjustDate(-1)} 
            className="p-3 text-slate-400 active:scale-75 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div 
            onClick={() => dateInputRef.current?.showPicker()} 
            className="flex-1 text-center py-2 cursor-pointer"
          >
            <span className="font-black text-slate-700 text-sm uppercase">
              {new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
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
            className="p-3 text-slate-400 active:scale-75 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {hasItems && !isEdit && (
          <button 
            onClick={onClear}
            className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-rose-500 active:scale-90 shadow-sm"
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