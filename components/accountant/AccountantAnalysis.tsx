import React, { useState, useMemo } from 'react';
import { Sale, Expense } from '../../types';
import {
  ArrowUpCircle, ArrowDownCircle, Banknote, FileText, Percent,
} from 'lucide-react';
import { PeriodSelector, PeriodMode, getPeriodRange, getPeriodLabel } from './sharedPeriod';

interface Props {
  sales: Sale[];
  expenses: Expense[];
}

const formatARS = (n: number) => Math.abs(Math.round(n)).toLocaleString('es-AR');
const monthLabel = (d: Date) =>
  new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d).replace('.', '');

const AccountantAnalysis: React.FC<Props> = ({ sales, expenses }) => {
  const [mode, setMode] = useState<PeriodMode>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  const data = useMemo(() => {
    const { from, to } = getPeriodRange(mode, selectedMonth);

    const fSales = sales.filter(
      (s) => s.date >= from && s.date <= to && s.status !== 'cancelled'
    );
    const fExpenses = expenses.filter((e) => e.date >= from && e.date <= to);

    const ingresos = fSales.reduce((sum, s) => sum + s.price * s.quantity, 0);
    const cogs = fSales.reduce((sum, s) => sum + (s.cost_price || 0) * s.quantity, 0);
    const margenBruto = ingresos - cogs;
    const egresos = fExpenses.reduce((sum, e) => sum + e.amount, 0);
    const facturadoA = fExpenses.reduce(
      (sum, e) => sum + (e.has_invoice_a ? e.invoice_amount : 0),
      0
    );
    const resultado = margenBruto - egresos;
    const margenPct = ingresos > 0 ? (margenBruto / ingresos) * 100 : 0;

    // Expenses by category
    const byCategory = new Map<string, number>();
    for (const e of fExpenses) {
      byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);
    }
    const categories = Array.from(byCategory.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        pct: egresos > 0 ? (amount / egresos) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly history — 12 months ending at selectedMonth (or "now" in 'all' mode)
    const months: { key: string; label: string; sales: number; expenses: number; result: number }[] = [];
    const anchor = mode === 'all' ? new Date() : selectedMonth;
    for (let i = 11; i >= 0; i--) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: monthLabel(d), sales: 0, expenses: 0, result: 0 });
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
    months.forEach((m) => (m.result = m.sales - m.expenses));
    const maxAbs = Math.max(1, ...months.map((m) => Math.max(m.sales, m.expenses)));

    return {
      ingresos,
      cogs,
      margenBruto,
      egresos,
      facturadoA,
      resultado,
      margenPct,
      categories,
      months,
      maxAbs,
    };
  }, [sales, expenses, mode, selectedMonth]);

  const periodSubtitle = getPeriodLabel(mode, selectedMonth);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Period selector */}
      <PeriodSelector
        mode={mode}
        selectedMonth={selectedMonth}
        onModeChange={setMode}
        onMonthChange={setSelectedMonth}
      />

      {/* Hero result */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
        <div
          className={`absolute top-0 right-0 w-72 h-72 -mr-10 -mt-10 rounded-full blur-3xl ${
            data.resultado >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
          }`}
        />
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 capitalize">
            Resultado del ejercicio · {periodSubtitle}
          </p>
          <p
            className={`text-7xl font-black tracking-tighter mb-2 ${
              data.resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ${formatARS(data.resultado)}
          </p>
          <p className="text-sm font-bold text-slate-300 max-w-xl">
            Margen bruto del{' '}
            <span className="text-white font-black">{data.margenPct.toFixed(1)}%</span> sobre
            ingresos de{' '}
            <span className="text-white font-black">${formatARS(data.ingresos)}</span>, descontados
            gastos por <span className="text-white font-black">${formatARS(data.egresos)}</span>.
          </p>
        </div>
      </div>

      {/* Estado de resultados + KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {/* Estado de resultados */}
        <div className="col-span-2 bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6">
          <div className="mb-5">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
              Estado de resultados
            </p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Composición</h3>
          </div>
          <div className="space-y-3">
            <Row label="Ingresos brutos" value={data.ingresos} icon={ArrowUpCircle} positive />
            <Row label="(−) Costo de mercadería" value={-data.cogs} icon={Banknote} />
            <div className="border-t border-slate-100 pt-3">
              <Row label="Margen bruto" value={data.margenBruto} icon={Percent} bold positive={data.margenBruto >= 0} />
              <p className="text-[10px] font-black text-slate-400 text-right pt-1 tracking-tighter">
                {data.margenPct.toFixed(1)}% sobre ventas
              </p>
            </div>
            <Row label="(−) Gastos operativos" value={-data.egresos} icon={ArrowDownCircle} />
            <div className="border-t-2 border-slate-200 pt-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                  Resultado neto
                </span>
                <span
                  className={`text-2xl font-black tracking-tighter ${
                    data.resultado >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {data.resultado < 0 && '−'}${formatARS(data.resultado)}
                </span>
              </div>
            </div>
            {data.facturadoA > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mt-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">
                  Incluye ${formatARS(data.facturadoA)} con factura A discriminada
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Side KPIs */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-emerald-50 p-2 rounded-xl">
                <Percent className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                Margen bruto
              </span>
            </div>
            <p className="text-3xl font-black text-emerald-600 tracking-tighter">
              {data.margenPct.toFixed(1)}%
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Sobre ingresos brutos</p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                Facturado A
              </span>
            </div>
            <p className="text-3xl font-black text-indigo-600 tracking-tighter">
              ${formatARS(data.facturadoA)}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Total con discriminación</p>
          </div>
        </div>
      </div>

      {/* 12-month chart */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
              Doce meses de operación
            </p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Curva anual</h3>
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

        <div className="relative h-[260px] flex items-end justify-between gap-2">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-t border-dashed border-slate-100" />
            ))}
          </div>
          {data.months.map((m) => (
            <div
              key={m.key}
              className="relative flex-1 h-full flex items-end justify-center gap-[3px] group"
            >
              <div
                className="w-[42%] max-w-[22px] bg-emerald-500 rounded-t-md transition-all hover:bg-emerald-600"
                style={{ height: `${(m.sales / data.maxAbs) * 100}%`, minHeight: '2px' }}
              />
              <div
                className="w-[42%] max-w-[22px] bg-rose-500 rounded-t-md transition-all hover:bg-rose-600"
                style={{ height: `${(m.expenses / data.maxAbs) * 100}%`, minHeight: '2px' }}
              />
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <p className="text-[8px] font-black uppercase tracking-tighter text-slate-400 mb-0.5">
                  {m.label}
                </p>
                <p className="text-[10px] font-black text-emerald-400">+${formatARS(m.sales)}</p>
                <p className="text-[10px] font-black text-rose-400">−${formatARS(m.expenses)}</p>
                <p
                  className={`text-[10px] font-black mt-1 pt-1 border-t border-white/10 ${
                    m.result >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {m.result < 0 && '−'}${formatARS(m.result)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-2 mt-3">
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

      {/* Categories breakdown */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6">
        <div className="mb-5">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">
            Composición de egresos
          </p>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Por rubro</h3>
        </div>

        <div className="space-y-3">
          {data.categories.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs font-bold text-slate-400">
                Sin egresos registrados en el período.
              </p>
            </div>
          )}
          {data.categories.map((c, i) => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[9px] font-black w-6 text-center py-1 rounded-md ${
                      i === 0
                        ? 'bg-rose-100 text-rose-600'
                        : i < 3
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-black text-slate-700 truncate uppercase tracking-tighter">
                    {c.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[10px] font-black text-slate-400 tracking-tighter">
                    {c.pct.toFixed(1)}%
                  </span>
                  <span className="text-sm font-black text-slate-800 tracking-tighter w-28 text-right">
                    ${formatARS(c.amount)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    i === 0 ? 'bg-rose-500' : i < 3 ? 'bg-slate-700' : 'bg-slate-400'
                  }`}
                  style={{ width: `${c.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{
  label: string;
  value: number;
  icon: any;
  positive?: boolean;
  bold?: boolean;
}> = ({ label, value, icon: Icon, positive, bold }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${positive ? 'text-emerald-500' : 'text-slate-400'}`} />
      <span
        className={`text-xs uppercase tracking-tighter ${
          bold ? 'font-black text-slate-800' : 'font-bold text-slate-500'
        }`}
      >
        {label}
      </span>
    </div>
    <span
      className={`tracking-tighter ${
        bold ? 'text-base font-black' : 'text-sm font-bold'
      } ${
        value < 0 ? 'text-rose-600' : positive || bold ? 'text-emerald-600' : 'text-slate-700'
      }`}
    >
      {value < 0 && '−'}${formatARS(value)}
    </span>
  </div>
);

export default AccountantAnalysis;
