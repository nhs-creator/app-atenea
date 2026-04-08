import React, { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { Tab } from '../../types';
import {
  ShoppingBag, LogOut, ArrowUpCircle, ArrowDownCircle, Receipt,
  Package, BarChart2, Users, Settings,
} from 'lucide-react';

interface Props {
  activeSection: Tab;
  onSectionChange: (s: Tab) => void;
  isSyncing: boolean;
  children: React.ReactNode;
}

type SectionColor = 'primary' | 'rose' | 'indigo' | 'orange' | 'slate' | 'emerald';

interface SectionDef {
  id: Tab;
  label: string;
  subtitle: string;
  icon: any;
  color: SectionColor;
}

const sections: SectionDef[] = [
  { id: 'form', label: 'Ingresos', subtitle: 'Registrar venta', icon: ArrowUpCircle, color: 'primary' },
  { id: 'expenses', label: 'Gastos', subtitle: 'Registrar egreso', icon: ArrowDownCircle, color: 'rose' },
  { id: 'list', label: 'Historial', subtitle: 'Movimientos del mes', icon: Receipt, color: 'indigo' },
  { id: 'inventory', label: 'Stock', subtitle: 'Inventario', icon: Package, color: 'orange' },
  { id: 'stats', label: 'Reporte', subtitle: 'Estadísticas', icon: BarChart2, color: 'slate' },
  { id: 'customers', label: 'Clientas', subtitle: 'Base de clientas', icon: Users, color: 'emerald' },
  { id: 'settings', label: 'Configuración', subtitle: 'Ajustes y categorías', icon: Settings, color: 'primary' },
];

// Tailwind needs literal class strings to generate utilities — keep them inline.
const activeNavClasses: Record<SectionColor, string> = {
  primary: 'bg-primary/10 text-primary',
  rose: 'bg-rose-50 text-rose-500',
  indigo: 'bg-indigo-50 text-indigo-600',
  orange: 'bg-orange-50 text-orange-500',
  slate: 'bg-slate-100 text-slate-800',
  emerald: 'bg-emerald-50 text-emerald-600',
};

const topbarSubtitleColor: Record<SectionColor, string> = {
  primary: 'text-primary',
  rose: 'text-rose-500',
  indigo: 'text-indigo-600',
  orange: 'text-orange-500',
  slate: 'text-slate-500',
  emerald: 'text-emerald-600',
};

const formatLongDate = (d: Date) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

const OwnerDesktopView: React.FC<Props> = ({
  activeSection,
  onSectionChange,
  isSyncing,
  children,
}) => {
  const { signOut } = useAuthActions();
  const [today] = useState(() => new Date());

  const active = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* === SIDEBAR === */}
      <aside className="w-64 shrink-0 bg-white border-r-2 border-slate-100 flex flex-col sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b-2 border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg italic">
              Atenea <span className="text-primary italic">Finanzas</span>
            </h1>
          </div>
          <div className="mt-3">
            <span className="inline-block text-[9px] font-black bg-primary/10 text-primary px-2 py-1 rounded-lg uppercase tracking-tighter">
              Dueña · Acceso completo
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sections.map((s) => {
            const isActive = activeSection === s.id;
            const Icon = s.icon;
            const colorClass = isActive
              ? activeNavClasses[s.color]
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600';
            return (
              <button
                key={s.id}
                onClick={() => onSectionChange(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-95 ${colorClass}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-black uppercase tracking-tighter leading-tight">
                    {s.label}
                  </div>
                  <div className="text-[9px] font-bold opacity-60 tracking-tight mt-0.5">
                    {s.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t-2 border-slate-100">
          <button
            onClick={() => void signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-sm font-black uppercase tracking-tighter">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* === MAIN === */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-30 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                topbarSubtitleColor[active.color]
              }`}
            >
              {active.subtitle}
            </p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{active.label}</h2>
          </div>
          <div className="flex items-center gap-4">
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">
                  Sincronizando
                </span>
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Hoy
              </p>
              <p className="text-sm font-black text-slate-700 capitalize">
                {formatLongDate(today)}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-8 py-6 w-full">{children}</div>
      </main>
    </div>
  );
};

export default OwnerDesktopView;
