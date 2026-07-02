import React from 'react';

interface OptionPickerProps {
  options: string[];
  onSelect: (value: string) => void;
  icons?: Record<string, React.ElementType>;
  /** Valor actualmente elegido — resalta esa opción. Solo tiene sentido en variant="chips" (filtros). */
  selected?: string;
  /** "grid": tarjetas grandes 2 columnas (alta de producto). "chips": pastillas compactas en fila (filtros). */
  variant?: 'grid' | 'chips';
  /** Chip extra al principio que representa "sin filtro" (ej. "TODAS"). Solo variant="chips". */
  allLabel?: string;
}

/**
 * Selector de opciones grandes y táctiles, reemplaza los <select> nativos
 * (requieren abrir el picker del sistema, más torpe en el celular). Se usa
 * tanto en el wizard de alta (variant="grid") como en los filtros de Stock
 * (variant="chips") para mantener la misma interacción en toda la app.
 */
const OptionPicker: React.FC<OptionPickerProps> = ({ options, onSelect, icons, selected, variant = 'grid', allLabel }) => {
  if (variant === 'chips') {
    const chips = allLabel ? [allLabel, ...options] : options;
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((opt) => {
          const value = opt === allLabel ? '' : opt;
          const isSelected = (selected || '') === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(value)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                isSelected
                  ? 'bg-primary/10 text-primary border-primary shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-500 border-transparent hover:border-slate-300'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const Icon = icons?.[opt];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wide text-center px-2 active:scale-95 hover:border-primary hover:bg-white transition-all"
          >
            {Icon && <Icon className="w-6 h-6 text-primary" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
};

export default OptionPicker;
