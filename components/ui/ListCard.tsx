import React from 'react';

export interface ListCardVariant {
  bg: string;
  border: string;
}

export const DEFAULT_LIST_CARD_VARIANT: ListCardVariant = { bg: 'bg-white', border: 'border-slate-100' };

interface ListCardProps {
  variant?: ListCardVariant;
  className?: string;
  children: React.ReactNode;
}

const ListCard: React.FC<ListCardProps> = ({ variant = DEFAULT_LIST_CARD_VARIANT, className, children }) => (
  <div className={`${variant.bg} rounded-[2rem] shadow-md border-2 ${variant.border} overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 ${className ?? ''}`}>
    {children}
  </div>
);

export default ListCard;
