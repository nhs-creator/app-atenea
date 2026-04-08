import React, { useState, useMemo } from 'react';
import { Sale, Expense, PaymentSplit } from '../../types';
import {
  Search, X, ArrowUpCircle, ArrowDownCircle, RefreshCcw, Receipt,
  ChevronDown, FileText, Package, CreditCard,
} from 'lucide-react';
import { PeriodSelector, PeriodMode, getPeriodRange } from './sharedPeriod';

interface Props {
  sales: Sale[];
  expenses: Expense[];
}

interface SaleItemDetail {
  name: string;
  quantity: number;
  size: string;
  price: number;
  listPrice: number;
}

interface ExpenseDetail {
  hasInvoiceA: boolean;
  invoiceAmount: number;
}

type LedgerEntry = {
  id: string;
  date: string;
  type: 'income' | 'expense';
  description: string;
  category: string;
  reference: string;
  amount: number;
  isReturn: boolean;
  // Sale-only details
  paymentDetails?: PaymentSplit[];
  saleItems?: SaleItemDetail[];
  // Expense-only details
  expense?: ExpenseDetail;
};

type FilterType = 'all' | 'income' | 'expense';

const PAYMENT_COLORS: Record<string, string> = {
  Efectivo: 'bg-emerald-500',
  Transferencia: 'bg-blue-600',
  Débito: 'bg-amber-500',
  Crédito: 'bg-rose-600',
  Vale: 'bg-orange-600',
};

const formatARS = (n: number) => Math.abs(Math.round(n)).toLocaleString('es-AR');
const formatDate = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

const AccountantLedger: React.FC<Props> = ({ sales, expenses }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<PeriodMode>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries: LedgerEntry[] = useMemo(() => {
    const { from, to } = getPeriodRange(mode, selectedMonth);

    // Group sales by client_number — one row per transaction
    const salesGrouped = new Map<string, Sale[]>();
    for (const s of sales) {
      if (s.status === 'cancelled') continue;
      if (s.date < from || s.date > to) continue;
      const key = s.client_number;
      if (!salesGrouped.has(key)) salesGrouped.set(key, []);
      salesGrouped.get(key)!.push(s);
    }

    const saleEntries: LedgerEntry[] = Array.from(salesGrouped.entries()).map(([cn, items]) => {
      const total = items.reduce((sum, s) => sum + s.price * s.quantity, 0);
      const itemCount = items.reduce((sum, s) => sum + Math.abs(s.quantity), 0);
      const desc =
        items.length === 1
          ? `${items[0].product_name}${items[0].quantity > 1 ? ` × ${items[0].quantity}` : ''}`
          : `${itemCount} unidades · ${items[0].product_name.slice(0, 36)}${
              items[0].product_name.length > 36 ? '…' : ''
            }`;
      const methods =
        items[0].payment_details && items[0].payment_details.length > 0
          ? Array.from(new Set(items[0].payment_details.map((p) => p.method))).join(' · ')
          : items[0].payment_method;
      return {
        id: `s-${cn}`,
        date: items[0].date,
        type: 'income',
        description: desc,
        category: methods,
        reference: `#${cn}`,
        amount: total,
        isReturn: total < 0,
        paymentDetails: items[0].payment_details,
        saleItems: items.map((it) => ({
          name: it.product_name,
          quantity: it.quantity,
          size: it.size || 'U',
          price: it.price,
          listPrice: Number(it.list_price ?? it.price),
        })),
      };
    });

    const expenseEntries: LedgerEntry[] = expenses
      .filter((e) => e.date >= from && e.date <= to)
      .map((e) => ({
        id: `e-${e.id}`,
        date: e.date,
        type: 'expense',
        description: e.description || '(sin descripción)',
        category: e.category,
        reference: e.has_invoice_a ? 'Fact. A' : '—',
        amount: e.amount,
        isReturn: false,
        expense: {
          hasInvoiceA: e.has_invoice_a,
          invoiceAmount: e.invoice_amount,
        },
      }));

    let combined = [...saleEntries, ...expenseEntries];

    if (filter !== 'all') combined = combined.filter((en) => en.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      combined = combined.filter(
        (en) =>
          en.description.toLowerCase().includes(q) ||
          en.category.toLowerCase().includes(q) ||
          en.reference.toLowerCase().includes(q)
      );
    }

    combined.sort((a, b) => b.date.localeCompare(a.date));
    return combined;
  }, [sales, expenses, filter, search, mode, selectedMonth]);

  const totals = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;
    for (const e of entries) {
      if (e.type === 'income') {
        if (e.amount >= 0) ingresos += e.amount;
        else egresos += Math.abs(e.amount);
      } else {
        egresos += e.amount;
      }
    }
    return { ingresos, egresos, neto: ingresos - egresos };
  }, [entries]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Period selector + type filter chips row */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector
          mode={mode}
          selectedMonth={selectedMonth}
          onModeChange={setMode}
          onMonthChange={setSelectedMonth}
        />
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner ml-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${
              filter === 'all' ? 'bg-white text-slate-800 shadow-md scale-[1.02]' : 'text-slate-500'
            }`}
          >
            Todo
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${
              filter === 'income' ? 'bg-white text-emerald-600 shadow-md scale-[1.02]' : 'text-slate-500'
            }`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${
              filter === 'expense' ? 'bg-white text-rose-500 shadow-md scale-[1.02]' : 'text-slate-500'
            }`}
          >
            Egresos
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              Total ingresos
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tighter">
            ${formatARS(totals.ingresos)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-4 h-4 text-rose-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              Total egresos
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 tracking-tighter">
            ${formatARS(totals.egresos)}
          </p>
        </div>
        <div className="bg-slate-900 rounded-2xl shadow-lg p-5 relative overflow-hidden">
          <div
            className={`absolute top-0 right-0 w-32 h-32 -mr-6 -mt-6 rounded-full blur-2xl ${
              totals.neto >= 0 ? 'bg-emerald-500/30' : 'bg-rose-500/30'
            }`}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                Saldo neto
              </span>
            </div>
            <p
              className={`text-2xl font-black tracking-tighter ${
                totals.neto >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totals.neto < 0 && '−'}${formatARS(totals.neto)}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input
          type="text"
          placeholder="Buscar concepto, categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border-2 border-slate-100 shadow-sm font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tighter"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Ledger table */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[100px_120px_minmax(0,1fr)_180px_100px_140px_36px] gap-4 px-6 py-4 bg-slate-50 border-b-2 border-slate-100">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Fecha</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Tipo</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Concepto</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
            Categoría / Pago
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter text-right">
            Comprob.
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter text-right">
            Monto
          </div>
          <div></div>
        </div>

        {/* Rows */}
        <div className="accountant-scroll max-h-[58vh] overflow-y-auto">
          {entries.length === 0 && (
            <div className="px-6 py-20 text-center">
              <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">
                Sin movimientos
              </p>
              <p className="text-xs font-bold text-slate-400 mt-1">
                No hay registros que coincidan con los filtros aplicados.
              </p>
            </div>
          )}
          {entries.map((e) => {
            const isExpense = e.type === 'expense';
            const isReturn = e.isReturn;
            const negative = isExpense || isReturn;
            const isExpanded = expandedId === e.id;
            return (
              <React.Fragment key={e.id}>
                <div
                  onClick={() => toggleExpand(e.id)}
                  className={`grid grid-cols-[100px_120px_minmax(0,1fr)_180px_100px_140px_36px] gap-4 px-6 py-3.5 border-b border-slate-100 cursor-pointer transition-colors items-center ${
                    isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-500">{formatDate(e.date)}</div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg ${
                        isReturn
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : isExpense
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}
                    >
                      {isReturn ? (
                        <>
                          <RefreshCcw className="w-2.5 h-2.5" /> Devol.
                        </>
                      ) : isExpense ? (
                        <>
                          <ArrowDownCircle className="w-2.5 h-2.5" /> Egreso
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="w-2.5 h-2.5" /> Ingreso
                        </>
                      )}
                    </span>
                  </div>
                  <div
                    className="text-sm font-black text-slate-700 truncate uppercase tracking-tighter"
                    title={e.description}
                  >
                    {e.description}
                  </div>
                  <div className="text-xs font-bold text-slate-500 truncate">{e.category}</div>
                  <div className="text-[10px] font-black text-slate-400 text-right uppercase tracking-tighter">
                    {e.reference}
                  </div>
                  <div
                    className={`text-sm font-black tracking-tighter text-right ${
                      negative ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {negative ? '−' : '+'}${formatARS(e.amount)}
                  </div>
                  <div className="flex items-center justify-center">
                    <ChevronDown
                      className={`w-4 h-4 text-slate-300 transition-transform ${
                        isExpanded ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="bg-slate-50 border-b-2 border-slate-100 px-7 py-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {e.type === 'income' ? (
                      <div className="grid grid-cols-2 gap-6">
                        {/* Productos */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              Productos
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {e.saleItems?.filter(it => it.name !== '💰 AJUSTE POR REDONDEO').map((it, i) => {
                              const lineTotal = it.price * it.quantity;
                              const lineList = it.listPrice * it.quantity;
                              const hasDiscount = it.listPrice > it.price;
                              return (
                                <div key={i} className="flex items-center justify-between text-xs gap-3">
                                  <span className="font-bold text-slate-600 truncate uppercase tracking-tighter">
                                    {it.quantity > 1 && (
                                      <span className="text-primary mr-1">{it.quantity}×</span>
                                    )}
                                    {it.name}
                                    <span className="text-[9px] text-slate-400 font-black ml-1">
                                      ({it.size})
                                    </span>
                                  </span>
                                  <div className="flex flex-col items-end shrink-0">
                                    {hasDiscount && (
                                      <span className="text-[9px] text-slate-300 line-through">
                                        ${lineList.toLocaleString('es-AR')}
                                      </span>
                                    )}
                                    <span
                                      className={`font-black tracking-tighter ${
                                        hasDiscount ? 'text-emerald-500' : 'text-slate-700'
                                      }`}
                                    >
                                      ${Math.abs(lineTotal).toLocaleString('es-AR')}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Medios de pago */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              Medios de pago
                            </span>
                          </div>
                          {e.paymentDetails && e.paymentDetails.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {e.paymentDetails.map((p, i) => {
                                const colorClass = PAYMENT_COLORS[p.method] || 'bg-slate-500';
                                return (
                                  <div
                                    key={i}
                                    className={`${colorClass} px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm`}
                                  >
                                    <span className="text-[9px] font-black text-white uppercase tracking-tighter">
                                      {p.method}
                                    </span>
                                    <span className="text-[11px] font-black text-white tracking-tighter">
                                      ${formatARS(p.amount)}
                                    </span>
                                    {p.installments && p.installments > 1 && (
                                      <span className="text-[9px] font-black text-white/80">
                                        / {p.installments} cuotas
                                      </span>
                                    )}
                                    {p.voucherCode && (
                                      <span className="text-[9px] font-black text-white/80">
                                        vale {p.voucherCode}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 italic">
                              Sin desglose registrado.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <ArrowDownCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              Detalle del egreso
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-baseline justify-between text-xs gap-3">
                              <span className="font-bold text-slate-400 uppercase tracking-tighter">
                                Categoría
                              </span>
                              <span className="font-black text-slate-700 uppercase tracking-tighter">
                                {e.category}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between text-xs gap-3">
                              <span className="font-bold text-slate-400 uppercase tracking-tighter">
                                Descripción
                              </span>
                              <span className="font-bold text-slate-600 text-right truncate">
                                {e.description}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              Comprobante
                            </span>
                          </div>
                          {e.expense?.hasInvoiceA ? (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 inline-flex items-center gap-3">
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <div>
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">
                                  Factura A
                                </p>
                                <p className="text-sm font-black text-indigo-700 tracking-tighter">
                                  ${formatARS(e.expense.invoiceAmount)}
                                </p>
                                <p className="text-[9px] font-bold text-indigo-500/70 mt-0.5">
                                  Discriminado del total
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 italic">
                              Sin factura A discriminada.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer count */}
        {entries.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t-2 border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              {entries.length} {entries.length === 1 ? 'movimiento' : 'movimientos'}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                +${formatARS(totals.ingresos)}
              </span>
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">
                −${formatARS(totals.egresos)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountantLedger;
