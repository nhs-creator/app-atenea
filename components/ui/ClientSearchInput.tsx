import React from 'react';
import { Search } from 'lucide-react';

interface ClientSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}

const ClientSearchInput: React.FC<ClientSearchInputProps> = ({ value, onChange, autoFocus, className }) => (
  <div className={`relative ${className ?? ''}`}>
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
    <input
      type="text"
      placeholder="BUSCAR POR NOMBRE O TEL..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      className="w-full h-14 pl-11 pr-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-xs outline-none focus:border-primary transition-all uppercase"
    />
  </div>
);

export default ClientSearchInput;
