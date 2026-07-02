import React from 'react';
import { WEEKDAY_NAMES } from '../../types';
import { Save } from 'lucide-react';

interface LocalHoursSectionProps {
  openDays: number[];
  toggleOpenDay: (day: number) => void;
  onSave: () => void;
}

const LocalHoursSection: React.FC<LocalHoursSectionProps> = ({ openDays, toggleOpenDay, onSave }) => {
  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_NAMES.map((name, day) => (
          <label
            key={day}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
              openDays.includes(day)
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <input
              type="checkbox"
              checked={openDays.includes(day)}
              onChange={() => toggleOpenDay(day)}
              className="sr-only"
            />
            <span className="text-sm font-bold">{name}</span>
          </label>
        ))}
      </div>
      <button
        onClick={onSave}
        className="w-full bg-primary hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        <Save className="w-3.5 h-3.5" /> Guardar
      </button>
    </div>
  );
};

export default LocalHoursSection;
