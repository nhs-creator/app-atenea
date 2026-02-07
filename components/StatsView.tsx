import React, { useMemo, useState } from 'react';
import { Sale, Expense, InventoryItem, ExpenseCategory } from '../types';
import { 
  TrendingUp, CreditCard, Wallet, Package, 
  AlertTriangle, ArrowUpCircle, ArrowDownCircle, User,
  ShoppingBag, Landmark, Banknote, Smartphone, Ticket,
  ChevronLeft, ChevronRight, Calendar, Calculator, ShieldCheck, Receipt, PieChart, PlusCircle
} from 'lucide-react';
import { CATEGORY_METADATA } from '../constants';

interface StatsViewProps {
  sales: Sale[];
  expenses: Expense[];
  inventory: InventoryItem[];
}

type Period = 'today' | 'week' | 'month';
type ViewMode = 'business' | 'personal';

const PAYMENT_CONFIG: Record<string, { icon: any, color: string }> = {
  'Efectivo': { icon: Banknote, color: 'text-emerald-500' },
  'Transferencia': { icon: Smartphone, color: 'text-blue-600' },
  'Débito': { icon: CreditCard, color: 'text-amber-500' },
  'Crédito': { icon: Landmark, color: 'text-rose-600' },
  'Vale': { icon: Ticket, color: 'text-orange-600' }
};

const StatsView: React.FC<StatsViewProps> = ({ sales = [], expenses = [], inventory = [] }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());

  const handlePrevMonth = () => {
    const d = new Date(selectedMonthDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedMonthDate(d);
  };
  const handleNextMonth = () => {
    const d = new Date(selectedMonthDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedMonthDate(d);
  };

  const filteredData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // CORRECCIÓN: Fin de mes incluye hasta el último milisegundo del día
    const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
    const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const filterByTime = (dateStr: string) => {
      if (period === 'today') return dateStr === todayStr;
      const d = new Date(dateStr + 'T12:00:00');
      if (period === 'week') return d >= weekAgo;
      if (period === 'month') return d >= startOfMonth && d <= endOfMonth;
      return true;
    };

    return {
      sales: sales.filter(s => filterByTime(s.date)),
      expenses: expenses.filter(e => filterByTime(e.date))
    };
  }, [sales, expenses, period, selectedMonthDate]);

  const metrics = useMemo(() => {
    let totalSales = 0;
    const paymentTotals: Record<string, number> = { 
      'Efectivo': 0, 'Transferencia': 0, 'Débito': 0, 'Crédito': 0, 'Vale': 0 
    };

    const processedTransactions = new Set<string>();

    filteredData.sales.forEach(s => {
      const price = Number(s.price) || 0;
      const qty = s.quantity || 1;
      
      // Matemática de ventas multiplicando por cantidad
      if (s.product_name === '💰 AJUSTE POR REDONDEO') {
        totalSales += price; 
      } else {
        totalSales += (price * qty);
      }

      if (!processedTransactions.has(s.client_number)) {
        let details = s.payment_details;
        
        // Parsear si viene como string (JSON)
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch (e) {
            console.error('Error parsing payment details:', e);
            details = [];
          }
        }

        if (Array.isArray(details) && details.length > 0) {
          details.forEach((p: any) => {
            if (paymentTotals[p.method] !== undefined) {
              paymentTotals[p.method] += Number(p.amount) || 0;
            }
          });
          processedTransactions.add(s.client_number);
        } else {
          // Fallback: Si no hay detalles de pago estructurados, usamos el método general
          // NO marcamos como procesado para sumar cada item de la transacción individualmente
          const method = s.payment_method || 'Efectivo';
          if (paymentTotals[method] === undefined) paymentTotals[method] = 0;
          paymentTotals[method] += (price * qty);
        }
      }
    });

    let businessExpenses = 0;
    let personalWithdrawals = 0;
    let totalInvoiceA = 0;
    let countInvoiceA = 0;
    
    // Track category totals
    const businessCategoryTotals: Record<string, number> = {};
    const personalCategoryTotals: Record<string, number> = {};

    filteredData.expenses.forEach(e => {
      const amount = Number(e.amount) || 0;
      const categoryMeta = CATEGORY_METADATA[e.category as ExpenseCategory];
      const isPersonal = e.type === 'personal' || (categoryMeta?.type === 'personal');
      
      if (isPersonal) {
        personalWithdrawals += amount;
        personalCategoryTotals[e.category] = (personalCategoryTotals[e.category] || 0) + amount;
      } else {
        businessExpenses += amount;
        businessCategoryTotals[e.category] = (businessCategoryTotals[e.category] || 0) + amount;
      }
      
      if (e.has_invoice_a) {
        totalInvoiceA += Number(e.invoice_amount) || 0;
        countInvoiceA++;
      }
    });

    const digitalRevenue = (paymentTotals['Transferencia'] || 0) + (paymentTotals['Débito'] || 0) + (paymentTotals['Crédito'] || 0);
    const netProfit = totalSales - businessExpenses;
    const finalBalance = netProfit - personalWithdrawals;

    const sortCategories = (totals: Record<string, number>) => {
      return Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .filter(([, amount]) => amount > 0);
    };

    return {
      totalSales, paymentTotals, digitalRevenue,
      businessExpenses, personalWithdrawals, totalInvoiceA, countInvoiceA,
      netProfit, finalBalance,
      topBusinessExpenses: sortCategories(businessCategoryTotals),
      topPersonalExpenses: sortCategories(personalCategoryTotals)
    };
  }, [filteredData]);

  const renderExpenseList = (items: [string, number][], type: 'business' | 'personal') => {
    if (items.length === 0) return (
      <div className="flex flex-col items-center justify-center py-10 opacity-50">
        <Receipt className="w-8 h-8 mb-2 text-slate-300" />
        <p className="text-xs text-slate-400 italic">No hay gastos registrados en este período.</p>
      </div>
    );

    const totalForType = type === 'business' ? metrics.businessExpenses : metrics.personalWithdrawals;

    return (
      <div className="space-y-3">
        {items.map(([cat, amount]) => {
          const meta = CATEGORY_METADATA[cat as ExpenseCategory];
          const Icon = meta?.icon || Receipt;
          const percentage = totalForType > 0 ? (amount / totalForType) * 100 : 0;

          return (
            <div key={cat} className="flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${meta?.styles.bg || 'bg-slate-100'} ${meta?.styles.iconColor || 'text-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-700">{cat}</p>
                  <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className={`h-full rounded-full ${type === 'business' ? 'bg-rose-400' : 'bg-pink-400'}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-sm font-black text-slate-600">-${amount.toLocaleString('es-AR')}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* HEADER: PERIOD & VIEW SELECTOR */}
      <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md pt-2 pb-2 space-y-3">
        {/* 1. Selector de Período */}
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-sm">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${period === p ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'}`}>
              {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

        {/* 2. Navegación Mes (si aplica) */}
        {period === 'month' && (
          <div className="flex items-center justify-between bg-white px-2 py-2 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-top-2">
            <button onClick={handlePrevMonth} className="p-2 text-slate-400 active:scale-75 transition-all"><ChevronLeft className="w-5 h-5" /></button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-black text-xs uppercase tracking-widest text-slate-700">
                {selectedMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button onClick={handleNextMonth} className="p-2 text-slate-400 active:scale-75 transition-all"><ChevronRight className="w-5 h-5" /></button>
          </div>
        )}

        {/* 3. Selector Negocio / Personal */}
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner mt-2">
            <button 
              onClick={() => setViewMode('business')} 
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'business' ? 'bg-white text-rose-600 shadow-md scale-[1.02]' : 'text-slate-500'}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> NEGOCIO
            </button>
            <button 
              onClick={() => setViewMode('personal')} 
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'personal' ? 'bg-white text-pink-600 shadow-md scale-[1.02]' : 'text-slate-500'}`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> PERSONAL
            </button>
        </div>
      </div>

      {/* VISTA NEGOCIO */}
      {viewMode === 'business' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          
          {/* Tarjeta Principal Negocio */}
          <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/20 -mr-10 -mt-10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ganancia Operativa (Ventas - Gastos)</p>
              <p className={`text-4xl font-black tracking-tighter mb-4 ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${metrics.netProfit.toLocaleString('es-AR')}
              </p>
              
              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 opacity-80"><ArrowUpCircle className="w-3 h-3" /><span className="text-[8px] font-black uppercase tracking-tighter">Ventas</span></div>
                  <p className="text-base font-bold text-slate-200">${metrics.totalSales.toLocaleString('es-AR')}</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-rose-400 opacity-80"><ArrowDownCircle className="w-3 h-3" /><span className="text-[8px] font-black uppercase tracking-tighter">Gastos Negocio</span></div>
                  <p className="text-base font-bold text-slate-200">${metrics.businessExpenses.toLocaleString('es-AR')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose Gastos Negocio */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4" /> Gastos Operativos
            </h3>
            {renderExpenseList(metrics.topBusinessExpenses, 'business')}
          </div>

          {/* Medios de Pago */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Ingresos por Medio de Pago
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(metrics.paymentTotals).filter(([_, amount]) => Number(amount) > 0).map(([method, amount]) => {
                const config = PAYMENT_CONFIG[method] || { icon: ShoppingBag, color: 'text-slate-400' };
                return (
                  <div key={method} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className={`flex items-center gap-2 mb-1 ${config.color}`}>
                      <config.icon className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase leading-none">{method}</span>
                    </div>
                    <p className="text-lg font-black text-slate-800">${Number(amount).toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Facturas A */}
          <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-indigo-600 p-2 rounded-xl text-white"><Receipt className="w-4 h-4" /></div>
              <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Facturación (A)</h3>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Monto Total</p>
                    <p className="text-2xl font-black text-indigo-900">${metrics.totalInvoiceA.toLocaleString('es-AR')}</p>
                </div>
                <div className="bg-indigo-100 px-3 py-1 rounded-lg">
                    <p className="text-xs font-black text-indigo-600">{metrics.countInvoiceA} comps.</p>
                </div>
            </div>
          </div>

          {/* ARCA */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="w-24 h-24" /></div>
            <div className="relative z-10">
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Radar Fiscal ARCA</span>
              <p className="text-3xl font-black tracking-tighter mt-1 mb-2">${metrics.digitalRevenue.toLocaleString('es-AR')}</p>
              <p className="text-[9px] font-medium text-indigo-100 opacity-80">Ingresos digitales informados (Transferencias + Tarjetas).</p>
            </div>
          </div>

        </div>
      )}

      {/* VISTA PERSONAL */}
      {viewMode === 'personal' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
            
          {/* Tarjeta Principal Personal */}
          <div className="bg-pink-600 rounded-[2.5rem] p-7 text-white shadow-2xl shadow-pink-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 -mr-10 -mt-10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 opacity-80">
                <User className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Retiros Totales</span>
              </div>
              <p className="text-5xl font-black tracking-tighter mb-2">-${metrics.personalWithdrawals.toLocaleString('es-AR')}</p>
              <p className="text-[10px] font-bold text-pink-100 opacity-70">Dinero retirado de la caja del negocio para uso personal.</p>
            </div>
          </div>

          {/* Desglose Gastos Personales */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Distribución de Gastos
            </h3>
            {renderExpenseList(metrics.topPersonalExpenses, 'personal')}
          </div>
            
          {/* Calculadora de Saldo Final (Informativa) */}
          <div className="bg-slate-900 rounded-3xl p-6 text-slate-400 border border-slate-800">
             <div className="flex items-center gap-2 mb-4 text-slate-500">
                <Calculator className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Impacto en Caja</span>
             </div>
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold">Ganancia Negocio</span>
                <span className="text-xs font-bold text-emerald-500">+${metrics.netProfit.toLocaleString('es-AR')}</span>
             </div>
             <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold">Retiros Personales</span>
                <span className="text-xs font-bold text-pink-500">-${metrics.personalWithdrawals.toLocaleString('es-AR')}</span>
             </div>
             <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-sm font-black text-white uppercase">Saldo Real</span>
                <span className={`text-xl font-black ${metrics.finalBalance >= 0 ? 'text-white' : 'text-rose-500'}`}>${metrics.finalBalance.toLocaleString('es-AR')}</span>
             </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default StatsView;