import React from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, PieChart as PieIcon, Package, DollarSign, 
  Ruler, AlertTriangle, TrendingDown, ShoppingBag 
} from 'lucide-react';
import { InventoryMetrics } from '../../hooks/useInventoryMetrics';

interface InventoryChartsProps {
  metrics: InventoryMetrics;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#e11d48', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const InventoryCharts: React.FC<InventoryChartsProps> = ({ metrics }) => {
  
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

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl p-5 border border-red-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-[9px] font-black text-red-600 uppercase tracking-widest">
              Sin Stock
            </div>
          </div>
          <div className="text-3xl font-black text-red-700">
            {metrics.outOfStockCount}
          </div>
          <div className="text-xs font-bold text-red-600/70 mt-1">
            {metrics.outOfStockCount === 1 ? 'Producto agotado' : 'Productos agotados'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-5 border border-amber-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
              Stock Bajo
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700">
            {metrics.lowStockCount}
          </div>
          <div className="text-xs font-bold text-amber-600/70 mt-1">
            {metrics.lowStockCount === 1 ? 'Producto necesita' : 'Productos necesitan'} reposición
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-5 border border-emerald-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
              Total Productos
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">
            {metrics.totalProducts}
          </div>
          <div className="text-xs font-bold text-emerald-600/70 mt-1">
            {metrics.totalUnits.toLocaleString('es-AR')} unidades totales
          </div>
        </div>
      </div>

      {/* Value Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Valor Inventario (Costo)
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${metrics.totalValue.toLocaleString('es-AR')}
          </div>
          <div className="text-xs text-slate-500 font-bold mt-1">
            Capital invertido en stock
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Valor Potencial (Venta)
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ${metrics.totalRetailValue.toLocaleString('es-AR')}
          </div>
          <div className="text-xs text-emerald-600/70 font-bold mt-1">
            Margen potencial: ${(metrics.totalRetailValue - metrics.totalValue).toLocaleString('es-AR')}
          </div>
        </div>
      </div>

      {/* Chart 1: Inventory Value Distribution by Category (Pie) */}
      {metrics.valueByCategory.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-500" /> Distribución de Valor por Categoría
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.valueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.valueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value: number) => [`$${value.toLocaleString('es-AR')}`, 'Valor']}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 text-center mt-2 font-bold">
            Muestra dónde está invertido tu capital
          </p>
        </div>
      )}

      {/* Chart 2: Stock Levels by Category (Bar) */}
      {metrics.stockByCategory.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" /> Stock por Categoría (Unidades)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.stockByCategory} margin={{ left: 0, right: 10, top: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value: number) => [`${value.toLocaleString('es-AR')} unidades`, 'Stock']}
                />
                <Bar dataKey="stock" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Chart 3: Top 10 Products by Value (Horizontal Bar) */}
      {metrics.topProducts.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Top 10 Productos por Valor Invertido
          </h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.topProducts} layout="vertical" margin={{ left: 120, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                  tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category"
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value: number, name: string, props: any) => [
                    `$${value.toLocaleString('es-AR')} (${props.payload.stock} unidades)`, 
                    'Valor'
                  ]}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 text-center mt-2 font-bold">
            Productos con mayor inversión de capital
          </p>
        </div>
      )}

      {/* Chart 4: Size Distribution */}
      {metrics.sizeDistribution.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-amber-500" /> Distribución de Talles
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.sizeDistribution} margin={{ left: 10, right: 10, top: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="size" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value: number) => [`${value.toLocaleString('es-AR')} unidades`, 'Stock']}
                />
                <Bar dataKey="quantity" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 text-center mt-2 font-bold">
            Unidades totales por talle en todo el inventario
          </p>
        </div>
      )}

      {/* Additional Stock Insights */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
          Análisis General
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="text-xs font-bold text-slate-600 mb-1">
              Promedio de Stock
            </div>
            <div className="text-2xl font-black text-slate-900">
              {metrics.averageStockPerProduct.toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-500 font-bold">
              unidades por producto
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="text-xs font-bold text-slate-600 mb-1">
              Margen Potencial
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {metrics.totalValue > 0 
                ? `${(((metrics.totalRetailValue - metrics.totalValue) / metrics.totalValue) * 100).toFixed(0)}%`
                : '0%'
              }
            </div>
            <div className="text-[10px] text-slate-500 font-bold">
              ${(metrics.totalRetailValue - metrics.totalValue).toLocaleString('es-AR')} en margen
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryCharts;
