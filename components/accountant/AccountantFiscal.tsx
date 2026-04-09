import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Sale, PaymentSplit } from '../../types';
import {
  ChevronLeft, ChevronRight, Calendar, FileBarChart, AlertCircle,
  TrendingUp, Banknote,
} from 'lucide-react';

interface Props {
  sales: Sale[];
}

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const formatARS = (n: number) => Math.abs(Math.round(n)).toLocaleString('es-AR');

// Parsea un string en formato AR ("1.234.567,89") o internacional ("1234567.89") a número
function parseARS(input: string): number {
  if (!input) return 0;
  const clean = input
    .replace(/[^\d.,\-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

const AccountantFiscal: React.FC<Props> = ({ sales }) => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const categories = useQuery(api.queries.monotributo.listCategories) ?? [];
  const currentLetter = useQuery(api.queries.monotributo.getCurrentCategory);
  const monthlyBilling = useQuery(api.queries.monotributo.listMonthlyBilling, {
    yearPrefix: String(year),
  }) ?? [];
  const upsertBilling = useMutation(api.mutations.monotributo.upsertMonthlyBilling);

  // Map yearMonth -> facturado for quick lookup
  const billingMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of monthlyBilling) {
      map[b.yearMonth] = b.facturado;
    }
    return map;
  }, [monthlyBilling]);

  // Compute monthly cobros from sales
  const monthlyData = useMemo(() => {
    const yearStr = String(year);

    // Dedupe by client_number — multiple sale rows of the same transaction share payment_details
    const transactionPayments = new Map<string, { yearMonth: string; payments: PaymentSplit[] }>();

    for (const s of sales) {
      if (s.status === 'cancelled') continue;
      if (!s.date.startsWith(yearStr)) continue;
      const ym = s.date.slice(0, 7);
      const key = `${s.client_number}|${ym}`;
      if (!transactionPayments.has(key)) {
        transactionPayments.set(key, { yearMonth: ym, payments: s.payment_details || [] });
      }
    }

    // Build empty rows for all 12 months
    const rows: Array<{
      yearMonth: string;
      label: string;
      efectivo: number;
      transferencia: number;
      debito: number;
      credito: number;
      totalSinEf: number;
      total: number;
    }> = [];

    for (let m = 0; m < 12; m++) {
      rows.push({
        yearMonth: `${year}-${String(m + 1).padStart(2, '0')}`,
        label: `${MONTH_LABELS[m]}-${String(year).slice(2)}`,
        efectivo: 0,
        transferencia: 0,
        debito: 0,
        credito: 0,
        totalSinEf: 0,
        total: 0,
      });
    }

    for (const { yearMonth, payments } of transactionPayments.values()) {
      const month = parseInt(yearMonth.slice(5), 10) - 1;
      if (month < 0 || month > 11) continue;
      const row = rows[month];
      for (const p of payments) {
        if (p.method === 'Efectivo') row.efectivo += p.amount;
        else if (p.method === 'Transferencia') row.transferencia += p.amount;
        else if (p.method === 'Débito') row.debito += p.amount;
        else if (p.method === 'Crédito') row.credito += p.amount;
        // Vale es intencional: no se cuenta como cobro
      }
      row.totalSinEf = row.transferencia + row.debito + row.credito;
      row.total = row.efectivo + row.totalSinEf;
    }

    return rows;
  }, [sales, year]);

  // Annual totals
  const annualTotals = useMemo(() => {
    let efectivo = 0;
    let transferencia = 0;
    let debito = 0;
    let credito = 0;
    let totalSinEf = 0;
    let total = 0;
    let facturado = 0;
    for (const m of monthlyData) {
      efectivo += m.efectivo;
      transferencia += m.transferencia;
      debito += m.debito;
      credito += m.credito;
      totalSinEf += m.totalSinEf;
      total += m.total;
      facturado += billingMap[m.yearMonth] || 0;
    }
    return { efectivo, transferencia, debito, credito, totalSinEf, total, facturado };
  }, [monthlyData, billingMap]);

  // Visible categories: current + 3 next (or first 4 if no current set)
  const visibleCategories = useMemo(() => {
    if (!categories.length) return [];
    if (!currentLetter) return categories.slice(0, 4);
    const idx = categories.findIndex((c) => c.letter === currentLetter);
    if (idx === -1) return categories.slice(0, 4);
    return categories.slice(idx, idx + 4);
  }, [categories, currentLetter]);

  const startEdit = (yearMonth: string, currentValue: number) => {
    setEditingMonth(yearMonth);
    setEditValue(currentValue ? String(Math.round(currentValue)) : '');
  };

  const saveEdit = async () => {
    if (!editingMonth) return;
    const value = parseARS(editValue);
    try {
      await upsertBilling({ yearMonth: editingMonth, facturado: value });
    } catch (e) {
      console.error(e);
    }
    setEditingMonth(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingMonth(null);
    setEditValue('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-white px-2 py-1.5 rounded-2xl border-2 border-slate-100 shadow-sm gap-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-2 text-slate-400 hover:text-primary active:scale-75 transition-all"
            aria-label="Año anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-black text-sm uppercase tracking-widest text-slate-700">
              Año {year}
            </span>
          </div>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="p-2 text-slate-400 hover:text-primary active:scale-75 transition-all"
            aria-label="Año siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {currentLetter && (
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl">
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
              Categoría actual
            </span>
            <span className="text-2xl font-black text-primary tracking-tighter leading-none">
              {currentLetter}
            </span>
          </div>
        )}
      </div>

      {/* Tabla 1: Cobros mensuales */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-100 bg-slate-50/50">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            Cuadro de cobros
          </p>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">
            Mensual por medio de pago — {year}
          </h3>
        </div>

        <div className="overflow-x-auto accountant-scroll">
          <div className="min-w-[1000px]">
            {/* Header row */}
            <div className="grid grid-cols-[80px_repeat(8,minmax(0,1fr))] gap-2 px-6 py-3 bg-slate-50 border-b-2 border-slate-100">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Período</div>
              <div className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter text-right">Efectivo</div>
              <div className="text-[9px] font-black text-blue-600 uppercase tracking-tighter text-right">Transferencia</div>
              <div className="text-[9px] font-black text-amber-600 uppercase tracking-tighter text-right">Débito</div>
              <div className="text-[9px] font-black text-rose-600 uppercase tracking-tighter text-right">Crédito</div>
              <div className="text-[9px] font-black text-slate-700 uppercase tracking-tighter text-right">Total sin ef</div>
              <div className="text-[9px] font-black text-slate-700 uppercase tracking-tighter text-right">Total</div>
              <div className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter text-right">Facturado</div>
              <div className="text-[9px] font-black text-rose-500 uppercase tracking-tighter text-right">Dif sin facturar</div>
            </div>

            {/* Rows */}
            {monthlyData.map((row) => {
              const facturado = billingMap[row.yearMonth] || 0;
              const dif = row.totalSinEf - facturado;
              const pctSinFacturar = row.totalSinEf > 0 ? (dif / row.totalSinEf) * 100 : 0;
              const isEditing = editingMonth === row.yearMonth;
              const hasData = row.total > 0;
              return (
                <div
                  key={row.yearMonth}
                  className={`grid grid-cols-[80px_repeat(8,minmax(0,1fr))] gap-2 px-6 py-3 border-b border-slate-100 last:border-0 items-center transition-colors ${
                    hasData ? 'hover:bg-slate-50' : 'opacity-60'
                  }`}
                >
                  <div className="text-xs font-black text-slate-700 uppercase tracking-tighter">
                    {row.label}
                  </div>
                  <div className="text-xs font-bold text-emerald-700 text-right tracking-tighter">
                    {row.efectivo > 0 ? `$${formatARS(row.efectivo)}` : '·'}
                  </div>
                  <div className="text-xs font-bold text-blue-700 text-right tracking-tighter">
                    {row.transferencia > 0 ? `$${formatARS(row.transferencia)}` : '·'}
                  </div>
                  <div className="text-xs font-bold text-amber-700 text-right tracking-tighter">
                    {row.debito > 0 ? `$${formatARS(row.debito)}` : '·'}
                  </div>
                  <div className="text-xs font-bold text-rose-700 text-right tracking-tighter">
                    {row.credito > 0 ? `$${formatARS(row.credito)}` : '·'}
                  </div>
                  <div className="text-xs font-black text-slate-800 text-right tracking-tighter">
                    {row.totalSinEf > 0 ? `$${formatARS(row.totalSinEf)}` : '·'}
                  </div>
                  <div className="text-xs font-black text-slate-800 text-right tracking-tighter">
                    {row.total > 0 ? `$${formatARS(row.total)}` : '·'}
                  </div>
                  {/* Facturado — editable */}
                  <div className="text-right">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          else if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        placeholder="0"
                        className="w-full h-8 px-2 bg-white border-2 border-indigo-300 rounded-lg text-xs font-black text-indigo-700 text-right outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(row.yearMonth, facturado)}
                        className={`w-full h-8 px-2 rounded-lg text-xs font-black text-right transition-colors ${
                          facturado > 0
                            ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100'
                            : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-200'
                        }`}
                      >
                        {facturado > 0 ? `$${formatARS(facturado)}` : 'Editar'}
                      </button>
                    )}
                  </div>
                  {/* Dif sin facturar */}
                  <div className="text-right">
                    {row.totalSinEf > 0 ? (
                      <div>
                        <div className="text-xs font-black text-rose-600 tracking-tighter">
                          ${formatARS(dif)}
                        </div>
                        <div className="text-[9px] font-bold text-rose-400">
                          {pctSinFacturar.toFixed(0)}% sin facturar
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">·</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Footer: annual totals */}
            <div className="grid grid-cols-[80px_repeat(8,minmax(0,1fr))] gap-2 px-6 py-4 bg-slate-900 text-white">
              <div className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
                Anual
              </div>
              <div className="text-xs font-black text-emerald-400 text-right tracking-tighter">
                ${formatARS(annualTotals.efectivo)}
              </div>
              <div className="text-xs font-black text-blue-400 text-right tracking-tighter">
                ${formatARS(annualTotals.transferencia)}
              </div>
              <div className="text-xs font-black text-amber-400 text-right tracking-tighter">
                ${formatARS(annualTotals.debito)}
              </div>
              <div className="text-xs font-black text-rose-400 text-right tracking-tighter">
                ${formatARS(annualTotals.credito)}
              </div>
              <div className="text-sm font-black text-white text-right tracking-tighter">
                ${formatARS(annualTotals.totalSinEf)}
              </div>
              <div className="text-sm font-black text-white text-right tracking-tighter">
                ${formatARS(annualTotals.total)}
              </div>
              <div className="text-sm font-black text-indigo-300 text-right tracking-tighter">
                ${formatARS(annualTotals.facturado)}
              </div>
              <div className="text-sm font-black text-rose-300 text-right tracking-tighter">
                ${formatARS(annualTotals.totalSinEf - annualTotals.facturado)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla 2: Categorías de monotributo */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
              Encuadre fiscal
            </p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Categorías de monotributo
            </h3>
          </div>
          <div className="text-[10px] font-bold text-slate-400 max-w-md text-right">
            Acumulado anual digital: <span className="text-slate-800 font-black">${formatARS(annualTotals.totalSinEf)}</span>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
            <FileBarChart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">
              Sin escala cargada
            </p>
            <p className="text-xs font-bold text-slate-400 mt-1">
              La dueña debe inicializar la escala desde Configuración.
            </p>
          </div>
        ) : !currentLetter ? (
          <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-700 uppercase tracking-tighter">
                Sin categoría actual
              </p>
              <p className="text-xs font-bold text-amber-600 mt-1">
                La dueña aún no eligió en qué categoría está. Mostrando las primeras 4 de la escala como referencia.
              </p>
            </div>
          </div>
        ) : null}

        {visibleCategories.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            {visibleCategories.map((c) => {
              const isCurrent = c.letter === currentLetter;
              const dif = c.maxBilling - annualTotals.totalSinEf;
              const exceeded = dif < 0;
              const pctUsed = c.maxBilling > 0 ? (annualTotals.totalSinEf / c.maxBilling) * 100 : 0;
              return (
                <div
                  key={c._id}
                  className={`rounded-2xl shadow-sm p-5 relative overflow-hidden ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-2 border-primary'
                      : 'bg-white border-2 border-slate-100'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded-bl-xl">
                      Actual
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl ${
                        isCurrent ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {c.letter}
                    </div>
                    <div>
                      <p
                        className={`text-[9px] font-black uppercase tracking-tighter ${
                          isCurrent ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        Categoría
                      </p>
                      <p
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {c.surfaceLimit ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p
                        className={`text-[9px] font-black uppercase tracking-tighter ${
                          isCurrent ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        Tope facturación anual
                      </p>
                      <p
                        className={`text-base font-black tracking-tighter ${
                          isCurrent ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        ${formatARS(c.maxBilling)}
                      </p>
                    </div>

                    <div>
                      <p
                        className={`text-[9px] font-black uppercase tracking-tighter ${
                          isCurrent ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        {exceeded ? 'Excedido por' : 'Margen disponible'}
                      </p>
                      <p
                        className={`text-base font-black tracking-tighter ${
                          exceeded
                            ? 'text-rose-400'
                            : isCurrent
                            ? 'text-emerald-400'
                            : 'text-emerald-600'
                        }`}
                      >
                        {exceeded && '−'}${formatARS(dif)}
                      </p>
                      {/* Progress bar */}
                      <div
                        className={`h-1.5 rounded-full overflow-hidden mt-2 ${
                          isCurrent ? 'bg-slate-700' : 'bg-slate-100'
                        }`}
                      >
                        <div
                          className={`h-full transition-all ${
                            exceeded
                              ? 'bg-rose-500'
                              : pctUsed > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, pctUsed)}%` }}
                        />
                      </div>
                      <p
                        className={`text-[9px] font-black mt-1 tracking-tighter ${
                          isCurrent ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        {pctUsed.toFixed(1)}% del tope
                      </p>
                    </div>

                    <div
                      className={`pt-3 border-t ${
                        isCurrent ? 'border-white/10' : 'border-slate-100'
                      }`}
                    >
                      <p
                        className={`text-[9px] font-black uppercase tracking-tighter ${
                          isCurrent ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        Monto monotributo
                      </p>
                      <p
                        className={`text-2xl font-black tracking-tighter ${
                          isCurrent ? 'text-primary' : 'text-slate-800'
                        }`}
                      >
                        ${formatARS(c.totalGoods)}
                      </p>
                      <p
                        className={`text-[9px] font-bold ${
                          isCurrent ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        Por mes (venta cosas muebles)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountantFiscal;
