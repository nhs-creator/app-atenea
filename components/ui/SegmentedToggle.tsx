import React from 'react';

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  activeColor: string;
}

interface SegmentedToggleProps<T extends string> {
  options: SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

function SegmentedToggle<T extends string>({ options, value, onChange, className }: SegmentedToggleProps<T>) {
  return (
    <div className={`flex bg-slate-200 p-1 rounded-2xl shadow-inner ${className ?? ''}`}>
      {options.map(opt => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              active ? `bg-white ${opt.activeColor} shadow-md scale-[1.02]` : 'text-slate-500'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedToggle;
