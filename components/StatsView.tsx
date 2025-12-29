import React, { useMemo } from 'react';
import { Sale, Expense, InventoryItem, PaymentMethod } from '../types';
import { PAYMENT_METHOD_COLORS } from '../constants';
import { 
  TrendingUp, CreditCard, Wallet, Package, 
  AlertTriangle, BarChart3, Clock, CalendarRange, CalendarDays 
} from 'lucide-react';

interface StatsViewProps {
  sales: Sale[];
  expenses: Expense[];
  inventory: InventoryItem[];
}

const StatsView: React.FC<StatsViewProps> = ({ 
  sales = [], 
  expenses = [], 
  inventory = [] 
}) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Helper para normalizar fechas y evitar desfases de zona horaria
  const getNormalizedDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    return new Date(dateStr + 'T00:00:00');
  };

  // 1. Cálculos de Ventas Temporales (Día, Semana, Mes)
  const statsTemporales = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Inicio de la semana (Lunes)
    const lunes = new Date(hoy);
    const day = lunes.getDay();
    const diff = lunes.getDate() - day + (day === 0 ? -6 : 1);
    lunes.setDate(diff);

    let totalDia = 0;
    let totalSemana = 0;
    let totalMes = 0;

    sales.forEach(s => {
      const d = getNormalizedDate(s.date);
      const val = s.price || 0;

      // Día exacto
      if (d.getTime() === hoy.getTime()) totalDia += val;
      
      // En la semana actual
      if (d >= lunes && d <= hoy) totalSemana += val;

      // En el mes actual
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) totalMes += val;
    });

    return { totalDia, totalSemana, totalMes };
  }, [sales, currentMonth, currentYear]);

  // 2. Filtrado de ventas del mes para métricas detalladas
  const monthSalesList = useMemo(() => (sales || []).filter(s => {
    if (!s.date) return false;
    const d = getNormalizedDate(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [sales, currentMonth, currentYear]);

  // 3. Cálculos financieros
  const totalMonthSales = statsTemporales.totalMes;
  const totalMonthCogs = monthSalesList.reduce((sum, s) => sum + ((s.cost_price || 0) * (s.quantity || 1)), 0);
  const grossProfit = totalMonthSales - totalMonthCogs;
  
  const totalMonthExpenses = useMemo(() => (expenses || []).filter(e => {
    if (!e.date) return false;
    const d = getNormalizedDate(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, e) => sum + (e.amount || 0), 0), [expenses, currentMonth, currentYear]);

  const netProfit = totalMonthSales - totalMonthExpenses;

  // 4. Valor de Inventario
  const inventoryValue = useMemo(() => 
    (inventory || []).reduce((sum, item) => {
      const stock = item.stock_total || 0; // Usamos stock_total de la DB
      const cost = item.cost_price || 0;
      return sum + (stock * cost);
    }, 0), [inventory]);
  
  // 5. Analytics por Categoría
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    monthSalesList.forEach(s => {
      const cat = s.category || 'Otros';
      stats[cat] = (stats[cat] || 0) + (s.price || 0);
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [monthSalesList]);

  const criticalItems = useMemo(() => 
    (inventory || []).filter(item => (item.stock_total || 0) > 0 && (item.stock_total || 0) <= 3).slice(0, 5), 
  [inventory]);

  return (
    <div className="space-y-6 pb-6">
      <h2 className="text-xl font-bold text-slate-800">Análisis Estratégico</h2>

      {/* TARJETAS RÁPIDAS DE VENTAS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="bg-emerald-50 p-1.5 rounded-lg mb-2">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Hoy</p>
          <p className="text-sm font-black text-slate-800">${statsTemporales.totalDia.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="bg-indigo-50 p-1.5 rounded-lg mb-2">
            <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Semana</p>
          <p className="text-sm font-black text-slate-800">${statsTemporales.totalSemana.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="bg-primary/10 p-1.5 rounded-lg mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Mes</p>
          <p className="text-sm font-black text-slate-800">${statsTemporales.totalMes.toLocaleString('es-AR')}</p>
        </div>
      </div>

      {/* BALANCE TÉCNICO */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 -mr-8 -mt-8 rounded-full"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance de Caja (Neto)</p>
            <span className="bg-teal-100 text-teal-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">En Tiempo Real</span>
          </div>
          <p className={`text-4xl font-extrabold tracking-tighter ${netProfit >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
            ${netProfit.toLocaleString('es-AR')}
          </p>
          
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase">Ganancia Bruta</span>
              </div>
              <p className="text-lg font-bold text-slate-800">${grossProfit.toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-slate-400 font-medium">Margen real s/costo</p>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                <Wallet className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Capital en Stock</span>
              </div>
              <p className="text-lg font-bold text-slate-800">${inventoryValue.toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-slate-400 font-medium">Mercadería a costo</p>
            </div>
          </div>
        </div>
      </div>

      {/* RENDIMIENTO DE CATEGORÍAS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 mb-5 border-b border-slate-50 pb-3">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-xs uppercase tracking-wider">Ventas por Categoría</h3>
        </div>
        
        <div className="space-y-4">
          {categoryStats.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4 italic">Sin datos de venta este mes</p>
          ) : (
            categoryStats.map(([cat, amount]) => {
              const percentage = totalMonthSales > 0 ? Math.round((amount / totalMonthSales) * 100) : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600 truncate">{cat}</span>
                    <span className="font-black text-slate-900">${amount.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-1000" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RADAR DE REPOSICIÓN */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2 text-slate-700">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Stock Crítico</h3>
          </div>
        </div>

        <div className="space-y-3">
          {criticalItems.length === 0 ? (
            <div className="flex flex-col items-center py-4 gap-2">
              <Package className="w-6 h-6 text-slate-200" />
              <p className="text-[10px] text-slate-400 font-medium">Niveles de stock óptimos</p>
            </div>
          ) : (
            criticalItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">{item.material || 'Sin mat.'} • {item.category}</p>
                </div>
                <span className={`text-[11px] font-black px-2 py-1 rounded-lg ${item.stock_total === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                  {item.stock_total || 0} UN.
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MÉTODOS DE PAGO */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 mb-4 border-b border-slate-50 pb-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-xs uppercase tracking-wider">Medios de Pago</h3>
        </div>
        
        <div className="space-y-3">
          {Object.entries(
            monthSalesList.reduce((acc, sale) => {
              const method = sale.payment_method || 'Otro';
              acc[method] = (acc[method] || 0) + (sale.price || 0);
              return acc;
            }, {} as Record<string, number>)
          )
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .map(([method, amount]) => {
              const colorInfo = PAYMENT_METHOD_COLORS[method as PaymentMethod] || { dot: 'bg-slate-300' };
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${colorInfo.dot}`}></div>
                    <span className="text-[11px] font-bold text-slate-500">{method}</span>
                  </div>
                  <span className="font-bold text-slate-800 text-xs">
                    ${amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default StatsView;