import React from 'react';
import { ExpenseCategoryMetadata } from '../types';

interface CategoryButtonProps {
  category: ExpenseCategoryMetadata;
  isActive: boolean;
  onClick: () => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ 
  category, 
  isActive, 
  onClick 
}) => {
  const Icon = category.icon;
  const color = category.color;

  // Hardcoded classes para evitar problemas de Tailwind JIT
  const getButtonClasses = () => {
    const baseClasses = 'flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl transition-all duration-200 min-h-[72px] border-2';
    
    if (isActive) {
      const activeColors: Record<string, string> = {
        'blue': 'bg-blue-600 border-blue-700 shadow-lg scale-105',
        'orange': 'bg-orange-600 border-orange-700 shadow-lg scale-105',
        'yellow': 'bg-yellow-500 border-yellow-600 shadow-lg scale-105',
        'slate': 'bg-slate-700 border-slate-800 shadow-lg scale-105',
        'rose': 'bg-rose-600 border-rose-700 shadow-lg scale-105',
        'violet': 'bg-violet-600 border-violet-700 shadow-lg scale-105',
        'cyan': 'bg-cyan-600 border-cyan-700 shadow-lg scale-105',
        'indigo': 'bg-indigo-600 border-indigo-700 shadow-lg scale-105',
        'emerald': 'bg-emerald-600 border-emerald-700 shadow-lg scale-105',
        'amber': 'bg-amber-600 border-amber-700 shadow-lg scale-105',
        'red': 'bg-red-600 border-red-700 shadow-lg scale-105',
        'teal': 'bg-teal-600 border-teal-700 shadow-lg scale-105',
        'pink': 'bg-pink-600 border-pink-700 shadow-lg scale-105',
      };
      return `${baseClasses} ${activeColors[color] || ''}`;
    } else {
      const hoverColors: Record<string, string> = {
        'blue': 'hover:border-blue-300 hover:bg-blue-50/50',
        'orange': 'hover:border-orange-300 hover:bg-orange-50/50',
        'yellow': 'hover:border-yellow-300 hover:bg-yellow-50/50',
        'slate': 'hover:border-slate-300 hover:bg-slate-50/50',
        'rose': 'hover:border-rose-300 hover:bg-rose-50/50',
        'violet': 'hover:border-violet-300 hover:bg-violet-50/50',
        'cyan': 'hover:border-cyan-300 hover:bg-cyan-50/50',
        'indigo': 'hover:border-indigo-300 hover:bg-indigo-50/50',
        'emerald': 'hover:border-emerald-300 hover:bg-emerald-50/50',
        'amber': 'hover:border-amber-300 hover:bg-amber-50/50',
        'red': 'hover:border-red-300 hover:bg-red-50/50',
        'teal': 'hover:border-teal-300 hover:bg-teal-50/50',
        'pink': 'hover:border-pink-300 hover:bg-pink-50/50',
      };
      return `${baseClasses} bg-white border-slate-100 hover:shadow-md ${hoverColors[color] || ''}`;
    }
  };

  const getIconClasses = () => {
    const baseClasses = 'w-5 h-5 flex-shrink-0 transition-colors';
    
    if (isActive) {
      return `${baseClasses} text-white`;
    } else {
      const iconColors: Record<string, string> = {
        'blue': 'text-blue-600',
        'orange': 'text-orange-600',
        'yellow': 'text-yellow-600',
        'slate': 'text-slate-600',
        'rose': 'text-rose-600',
        'violet': 'text-violet-600',
        'cyan': 'text-cyan-600',
        'indigo': 'text-indigo-600',
        'emerald': 'text-emerald-600',
        'amber': 'text-amber-600',
        'red': 'text-red-600',
        'teal': 'text-teal-600',
        'pink': 'text-pink-600',
      };
      return `${baseClasses} ${iconColors[color] || 'text-slate-600'}`;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={getButtonClasses()}
    >
      <Icon className={getIconClasses()} />
      <span className={`text-[7.5px] font-black uppercase tracking-tighter text-center leading-tight transition-colors ${
        isActive ? 'text-white' : 'text-slate-500'
      }`}>
        {category.id}
      </span>
    </button>
  );
};

export default CategoryButton;