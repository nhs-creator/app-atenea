import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import DaySelector from '../ui/DaySelector';

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
  return (
    <div className="space-y-3">
      {/* Selector de Fecha y Borrado */}
      <div className="flex items-center gap-2">
        <DaySelector date={date} onDateChange={onDateChange} className="flex-1" />

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
