import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface FilterButtonProps {
  active: boolean;
  activeCount?: number;
  onClick: () => void;
  size?: 'sm' | 'lg';
  className?: string;
  ariaLabel?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({ active, activeCount = 0, onClick, size = 'sm', className, ariaLabel = 'Filtros' }) => {
  const sizeClass = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`relative ${sizeClass} flex-shrink-0 flex items-center justify-center rounded-2xl border-2 shadow-sm transition-all active:scale-90 ${
        active || activeCount > 0 ? 'bg-primary border-primary text-white' : 'bg-white border-slate-100 text-slate-400'
      } ${className ?? ''}`}
    >
      <SlidersHorizontal className="w-4 h-4" />
      {activeCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center border-2 border-white">{activeCount}</span>
      )}
    </button>
  );
};

export default FilterButton;
