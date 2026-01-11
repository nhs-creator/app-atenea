import React, { useMemo, useState } from 'react';
import { Sale, Expense, InventoryItem } from '../types';
import { 
  TrendingUp, CreditCard, Wallet, Package, 
  AlertTriangle, ArrowUpCircle, ArrowDownCircle, User,
  Percent, ShoppingBag, Landmark, Banknote, Smartphone, Ticket,
  ChevronLeft, ChevronRight, Calendar, Calculator
} from 'lucide-react';

interface StatsViewProps {
  sales: Sale[];
  expenses: Expense[];
  inventory: InventoryItem[];
}

type Period = 'today' | 'week' | 'month';

const PAYMENT_CONFIG: Record<string, { icon: any, color: string }> = {
  'Efectivo': { icon: Banknote, color: 'text-emerald-500' },
  'Transferencia': { icon: Smartphone, color: 'text-blue-600' },
  'Débito': { icon: CreditCard, color: 'text-amber-500' },
  'Crédito': { icon: Landmark, color: 'text-rose-600' },
  'Vale': { icon: Ticket, color: 'text-orange-600' }
};

const StatsView: React.FC<StatsViewProps> = ({ sales = [], expenses = [], inventory = [] }) => {
  const [period, setPeriod] = useState<Period>('month');
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
    const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
    const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);

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
    let totalDiscounts = 0;
    const paymentTotals: Record<string, number> = { 
      'Efectivo': 0, 'Transferencia': 0, 'Débito': 0, 'Crédito': 0, 'Vale': 0 
    };

    const processedTransactions = new Set<string>();

    filteredData.sales.forEach(s => {
      const price = Number(s.price) || 0;
      const listPrice = Number(s.list_price) || 0;
      totalSales += price;
      if (listPrice > price) totalDiscounts += (listPrice - price);

      if (!processedTransactions.has(s.client_number)) {
        if (Array.isArray(s.payment_details) && s.payment_details.length > 0) {
          s.payment_details.forEach(p => {
            if (paymentTotals[p.method] !== undefined) {
              paymentTotals[p.method] += Number(p.amount) || 0;
            }
          });
        } else {
          paymentTotals[s.payment_method] = (paymentTotals[s.payment_method] || 0) + price;
        }
        processedTransactions.add(s.client_number);
      } else {
        if (!Array.isArray(s.payment_details) || s.payment_details.length === 0) {
          paymentTotals[s.payment_method] = (paymentTotals[s.payment_method] || 0) + price;
        }
      }
    });

    let businessExpenses = 0;
    let personalWithdrawals = 0;
    filteredData.expenses.forEach(e => {
      if (e.category === 'Personal') personalWithdrawals += Number(e.amount);
      else businessExpenses += Number(e.amount);
    });

    const sizeStats: Record<string, number> = {};
    filteredData.sales.forEach(s => {
      if (s.size && s.price > 0) sizeStats[s.size] = (sizeStats[s.size] || 0) + s.quantity;
    });

    const sortedSizes: [string, number][] = Object.entries(sizeStats)
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    const netProfit = totalSales - businessExpenses;
    const finalBalance = netProfit - personalWithdrawals;

    return {
      totalSales, totalDiscounts, paymentTotals,
      businessExpenses, personalWithdrawals,
      netProfit, finalBalance,
      sizeStats: sortedSizes.slice(0, 3)
    };
  }, [filteredData]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* 1. SELECTOR DE PERÍODO Y MES */}
      <div className="space-y-3 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md pt-2 pb-4">
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-sm">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${period === p ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'}`}>
              {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

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
      </div>

      {/* 2. SALUD DEL NEGOCIO */}
      <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 -mr-10 -mt-10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ganancia Negocio (Limpia)</p>
          <p className="text-4xl font-black tracking-tighter mb-4 text-teal-400">${metrics.netProfit.toLocaleString('es-AR')}</p>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-pink-300 bg-pink-500/10 p-2.5 rounded-xl border border-pink-500/20">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase">Retiro Personal</span>
              </div>
              <p className="font-bold text-sm">-${metrics.personalWithdrawals.toLocaleString('es-AR')}</p>
            </div>
            
            <div className="pt-3 border-t border-white/10 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Final Real</p>
                <p className={`text-3xl font-black tracking-tighter ${metrics.finalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                  ${metrics.finalBalance.toLocaleString('es-AR')}
                </p>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <Calculator className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-400 opacity-80">
                <ArrowUpCircle className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase">Ingresos</span>
              </div>
              <p className="text-base font-bold text-slate-200">${metrics.totalSales.toLocaleString('es-AR')}</p>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-rose-400 opacity-80">
                <ArrowDownCircle className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase">Gastos Fijos</span>
              </div>
              <p className="text-base font-bold text-slate-200">${metrics.businessExpenses.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CAJA POR MEDIO DE PAGO */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" /> ¿Dónde está la plata?
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

      <div className="grid grid-cols-2 gap-4">
        {/* 4. CURVA DE TALLES */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Talles + Vendidos</h3>
          <div className="space-y-3">
            {metrics.sizeStats.length === 0 ? <p className="text-[10px] text-slate-300">Sin ventas</p> : metrics.sizeStats.map(([size, qty]) => (
              <div key={size} className="flex items-center justify-between">
                <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">{size}</span>
                <div className="flex-1 mx-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${(qty / metrics.sizeStats[0][1]) * 100}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{qty}u.</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. IMPACTO DE PROMOS */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Bonificaciones</h3>
            <p className="text-2xl font-black text-emerald-500">${metrics.totalDiscounts.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 p-2 rounded-xl mt-4">
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* 6. STOCK CRÍTICO */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Radar de Stock
          </h3>
          <span className="bg-rose-100 text-rose-600 text-[8px] font-black px-2 py-1 rounded-lg uppercase">Reponer</span>
        </div>
        <div className="space-y-3">
          {inventory.filter(i => (i.stock_total || 0) <= 2).slice(0, 4).map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="min-w-0 flex-1 mr-4">
                <p className="text-xs font-bold text-slate-700 truncate uppercase">{item.name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{item.category}</p>
              </div>
              <span className={`px-3 py-1 rounded-xl text-[10px] font-black ${item.stock_total === 0 ? 'bg-rose-200 text-rose-700' : 'bg-amber-200 text-amber-700'}`}>
                {item.stock_total || 0} UN.
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsView;