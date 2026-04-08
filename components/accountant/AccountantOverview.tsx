import React, { useState, useMemo } from 'react';
import { Sale, Expense } from '../../types';
import {
  ArrowUpCircle, ArrowDownCircle, Receipt, TrendingUp, ShoppingBag,
} from 'lucide-react';

type Period = 'mtd' | 'lastm' | 'ytd' | 'all';

interface Props {
  sales: Sale[];
  expenses: Expense[];
}

const formatARS = (n: number) => Math.abs(Math.round(n)).toLocaleString('es-AR');
const monthLabel = (d: Date) =>
  new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d).replace('.', '');

const periodLabels: Record<Period, string> = {
  mtd: 'Este mes',
  lastm: 'Mes pasado',
  ytd: 'Este año',
  all: 'Histórico',
};

function getPeriodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (period === 'mtd') return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
  if (period === 'lastm') return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
  if (period === 'ytd') return { from: fmt(new Date(y, 0, 1)), to: fmt(new Date(y, 11, 31)) };
  return { from: '0000-00-00', to: '9999-99-99' };
}

const AccountantOverview: React.FC<Props> = ({ sales, expenses }) => {
  const [period, setPeriod] = useState<Period>('mtd');

  const data = useMemo(() => {
    const { from, to } = getPeriodRange(period);

    const fSales = sales.filter(
      (s) => s.date >= from && s.date <= to && s.status !== 'cancelled'
    );
    const fExpenses = expenses.filter((e) => e.date >= from && e.date <= to);

    const ingresos = fSales.reduce((sum, s) => sum + s.price * s.quantity, 0);
    const egresos = fExpenses.reduce((sum, e) => sum + e.amount, 0);
    const resultado = ingresos - egresos;
    const operaciones = new Set(fSales.map((s) => s.client_number)).size;
    const ticketProm = operaciones > 0 ? ingresos / operaciones : 0;

    // Monthly trend last 6 months
    const months: { key: string; label: string; sales: number; expenses: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: monthLabel(d), sales: 0, expenses: 0 });
    }
    for (const s of sales) {
      if (s.status === 'cancelled') continue;
      const key = s.date.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.sales += s.price * s.quantity;
    }
    for (const e of expenses) {
      const key = e.date.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.expenses += e.amount;
    }
    const maxBar = Math.max(1, ...months.flatMap((m) => [m.sales, m.expenses]));

    const recentSales = [...fSales]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);

    return { ingresos, egresos, resultado, operaciones, ticketProm, months, maxBar, recentSales };
  }, [sales, expenses, period]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Period chips */}
      <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner max-w-md">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${
              period === p ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Hero result card */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
        <div
          className={`absolute top-0 right-0 w-60 h-60 -mr-10 -mt-10 rounded-full blur-3xl ${
            data.resultado >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
          }`}
        />
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
            Ganancia operativa · {periodLabels[period]}
          </p>
          <p
            className={`text-6xl font-black tracking-tighter mb-6 ${
              data.resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ${formatARS(data.resultado)}
          </p>

          <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 opacity-80">
                <ArrowUpCircle className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Ingresos</span>
              </div>
              <p className="text-xl font-black text-slate-100">${formatARS(data.ingresos)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400 opacity-80">
                <ArrowDownCircle className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-tighter">
                  Gastos negocio
                </span>
              </div>
              <p className="text-xl font-black text-slate-100">${formatARS(data.egresos)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-300 opacity-80">
                <Receipt className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-tighter">
                  Operaciones
                </span>
              </div>
              <p className="text-xl font-black text-slate-100">{data.operaciones}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={ShoppingBag}
          color="primary"
          label="Ingresos brutos"
          value={`$${formatARS(data.ingresos)}`}
          hint="Ventas del período"
        />
        <KpiCard
          icon={ArrowDownCircle}
          color="rose"
          label="Egresos"
          value={`$${formatARS(data.egresos)}`}
          hint="Solo gastos de negocio"
        />
        <KpiCard
          icon={Receipt}
          color="indigo"
          label="Operaciones"
          value={data.operaciones.toLocaleString('es-AR')}
          hint="Ventas registradas"
        />
        <KpiCard
          icon={TrendingUp}
          color="emerald"
          label="Ticket promedio"
          value={`$${formatARS(data.ticketProm)}`}
          hint="Por operación"
        />
      </div>

      {/* Trend + recent activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trend chart */}
        <div className="col-span-2 bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                Tendencia mensual
              </p>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Últimos 6 meses</h3>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-tighter">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Ventas
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" /> Gastos
              </span>
            </div>
          </div>

          <div className="relative h-[220px] flex items-end justify-between gap-3">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-t border-dashed border-slate-100" />
              ))}
            </div>
            {data.months.map((m, i) => (
              <div
                key={m.key}
                className="relative flex-1 h-full flex items-end justify-center gap-1.5 group"
              >
                <div
                  className="w-1/2 max-w-[26px] bg-emerald-500 rounded-t-md transition-all hover:bg-emerald-600"
                  style={{ height: `${(m.sales / data.maxBar) * 100}%`, minHeight: '2px' }}
                />
                <div
                  className="w-1/2 max-w-[26px] bg-rose-500 rounded-t-md transition-all hover:bg-rose-600"
                  style={{ height: `${(m.expenses / data.maxBar) * 100}%`, minHeight: '2px' }}
                />
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  <p className="text-[8px] font-black uppercase tracking-tighter text-slate-400 mb-0.5">
                    {m.label}
                  </p>
                  <p className="text-[10px] font-black text-emerald-400">
                    +${formatARS(m.sales)}
                  </p>
                  <p className="text-[10px] font-black text-rose-400">−${formatARS(m.expenses)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-3 mt-3">
            {data.months.map((m) => (
              <div
                key={m.key}
                className="flex-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-tighter"
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6">
          <div className="mb-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
              Últimas operaciones
            </p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Actividad reciente</h3>
          </div>
          <div className="space-y-2">
            {data.recentSales.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs font-bold text-slate-400">
                  Sin operaciones en el período.
                </p>
              </div>
            )}
            {data.recentSales.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-700 truncate uppercase tracking-tighter">
                    {s.product_name}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {s.date} · #{s.client_number}
                  </p>
                </div>
                <div
                  className={`text-xs font-black tracking-tighter shrink-0 ${
                    s.price >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {s.price < 0 ? '−' : '+'}${formatARS(s.price * s.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{
  icon: any;
  color: 'primary' | 'rose' | 'indigo' | 'emerald';
  label: string;
  value: string;
  hint: string;
}> = ({ icon: Icon, color, label, value, hint }) => {
  const colorMap = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  };
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.bg} p-2 rounded-xl`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">
        {label}
      </p>
      <p className="text-2xl font-black text-slate-800 tracking-tighter">{value}</p>
      <p className="text-[9px] font-bold text-slate-400 mt-1">{hint}</p>
    </div>
  );
};

export default AccountantOverview;
