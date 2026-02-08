import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, ShieldCheck, Banknote, Smartphone, CreditCard, Landmark, Ticket } from 'lucide-react';

interface StatsChartsProps {
  totalSales: number;
  digitalRevenue: number;
  businessExpenses: number;
  salesTrend: any[];
  paymentDistribution: any[];
  paymentTotals: Record<string, number>;
  showOnly?: 'trend_and_payments' | 'efficiency';
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#e11d48', '#ea580c'];

const PAYMENT_CONFIG: Record<string, { icon: any, color: string }> = {
  'Efectivo': { icon: Banknote, color: 'text-emerald-500' },
  'Transferencia': { icon: Smartphone, color: 'text-blue-600' },
  'Débito': { icon: CreditCard, color: 'text-amber-500' },
  'Crédito': { icon: Landmark, color: 'text-rose-600' },
  'Vale': { icon: Ticket, color: 'text-orange-600' }
};

const StatsCharts: React.FC<StatsChartsProps> = ({ 
  totalSales, digitalRevenue, businessExpenses,
  salesTrend, paymentDistribution, paymentTotals,
  showOnly
}) => {
  const expenseRatio = totalSales > 0 ? (businessExpenses / totalSales) * 100 : 0;
  const digitalRatio = totalSales > 0 ? (digitalRevenue / totalSales) * 100 : 0;

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black">
        {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
      </text>
    );
  };

  if (showOnly === 'trend_and_payments') {
    return (
      <div className="space-y-6">
        {/* 1. Tendencia de Ventas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Tendencia de Ventas (ARS)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={salesTrend} margin={{ left: 15, right: 10 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(val: number) => [`$${val.toLocaleString('es-AR')}`, 'Ventas']} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Control de Ingresos (Lado a Lado) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-500" /> Control de Ingresos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Gráfico de Torta */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={paymentDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                  >
                    {paymentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none' }}
                    formatter={(val: number) => `$${val.toLocaleString('es-AR')}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Lista de Medios de Pago (Barras integradas) */}
            <div className="space-y-3">
              {(Object.entries(paymentTotals) as [string, number][])
                .filter(([_, amount]) => amount > 0)
                .map(([method, amount], idx) => {
                  const config = PAYMENT_CONFIG[method] || { icon: Banknote, color: 'text-slate-400' };
                  const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;
                  
                  return (
                    <div key={method} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                      <div className="relative z-10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-white shadow-sm ${config.color}`}>
                            <config.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-400 leading-none mb-1">{method}</p>
                            <p className="text-sm font-black text-slate-800">${amount.toLocaleString('es-AR')}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de progreso integrada al fondo de la card */}
                      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100">
                        <div 
                          className="h-full transition-all duration-1000 ease-out"
                          style={{ 
                            backgroundColor: COLORS[idx % COLORS.length], 
                            width: `${percentage}%` 
                          }}
                        />
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Eficiencia (al final del StatsView)
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-indigo-500" /> Eficiencia y Salud Fiscal
      </h3>
      
      <div className="space-y-5">
        <div>
          <div className="flex justify-between text-[10px] font-black uppercase mb-2">
            <span className="text-slate-400">Gastos vs Ventas</span>
            <span className={expenseRatio > 50 ? 'text-rose-500' : 'text-emerald-500'}>
              {expenseRatio.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-rose-400 transition-all duration-1000" 
              style={{ width: `${Math.min(expenseRatio, 100)}%` }}
            />
            <div className="h-full bg-emerald-400 flex-1" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[8px] font-black text-indigo-200 uppercase tracking-[0.2em]">Dinero en Blanco (Digital)</span>
              <p className="text-2xl font-black mt-1">${digitalRevenue.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl text-center min-w-[60px]">
              <span className="block text-xl font-black leading-none">{digitalRatio.toFixed(0)}%</span>
              <span className="text-[7px] font-bold uppercase opacity-70">del total</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCharts;