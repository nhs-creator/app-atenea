import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  size?: 'sm' | 'lg';
  focusColorClass?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder, size = 'sm', focusColorClass = 'focus:border-primary', className }) => {
  const heightClass = size === 'lg' ? 'h-14' : 'h-12';

  return (
    <div className={`relative group flex-1 ${className ?? ''}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${heightClass} pl-11 pr-10 rounded-2xl bg-white border-2 border-slate-100 shadow-sm font-bold text-sm outline-none ${focusColorClass} transition-all uppercase tracking-tighter`}
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400"><X className="w-3 h-3" /></button>
      )}
    </div>
  );
};

export default SearchBar;
