import React, { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { Sale, Expense } from '../../types';
import {
  ShoppingBag, LogOut, BarChart2, Receipt, LayoutDashboard, FileBarChart,
} from 'lucide-react';
import AccountantOverview from './AccountantOverview';
import AccountantLedger from './AccountantLedger';
import AccountantAnalysis from './AccountantAnalysis';
import AccountantFiscal from './AccountantFiscal';
import './accountant.css';

type Section = 'overview' | 'ledger' | 'analysis' | 'fiscal';

interface Props {
  sales: Sale[];
  expenses: Expense[];
  isSyncing: boolean;
}

const sections = [
  { id: 'overview' as Section, label: 'Resumen', subtitle: 'Vista general', icon: LayoutDashboard, color: 'primary' },
  { id: 'ledger' as Section, label: 'Movimientos', subtitle: 'Ingresos y egresos', icon: Receipt, color: 'indigo' },
  { id: 'analysis' as Section, label: 'Reporte', subtitle: 'Análisis del período', icon: BarChart2, color: 'slate' },
  { id: 'fiscal' as Section, label: 'Fiscal', subtitle: 'Cobros y monotributo', icon: FileBarChart, color: 'emerald' },
];

const formatLongDate = (d: Date) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

const AccountantDesktopView: React.FC<Props> = ({ sales, expenses, isSyncing }) => {
  const { signOut } = useAuthActions();
  const [section, setSection] = useState<Section>('overview');
  const [today] = useState(() => new Date());

  const activeSection = sections.find((s) => s.id === section)!;

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
            <span className="inline-block text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg uppercase tracking-tighter">
              Contadora · Solo lectura
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sections.map((s) => {
            const active = section === s.id;
            const Icon = s.icon;
            const colorClasses = active
              ? s.color === 'primary'
                ? 'bg-primary/10 text-primary'
                : s.color === 'indigo'
                ? 'bg-indigo-50 text-indigo-600'
                : s.color === 'emerald'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-100 text-slate-800'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600';
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-95 ${colorClasses}`}
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
                activeSection.color === 'primary'
                  ? 'text-primary'
                  : activeSection.color === 'indigo'
                  ? 'text-indigo-600'
                  : activeSection.color === 'emerald'
                  ? 'text-emerald-600'
                  : 'text-slate-500'
              }`}
            >
              {activeSection.subtitle}
            </p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {activeSection.label}
            </h2>
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
              <p className="text-sm font-black text-slate-700 capitalize">{formatLongDate(today)}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-8 py-6 max-w-[1500px] w-full">
          {section === 'overview' && <AccountantOverview sales={sales} expenses={expenses} />}
          {section === 'ledger' && <AccountantLedger sales={sales} expenses={expenses} />}
          {section === 'analysis' && <AccountantAnalysis sales={sales} expenses={expenses} />}
          {section === 'fiscal' && <AccountantFiscal sales={sales} />}
        </div>
      </main>
    </div>
  );
};

export default AccountantDesktopView;
