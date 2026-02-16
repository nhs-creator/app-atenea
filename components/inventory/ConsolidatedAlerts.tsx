import React, { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LowStockItem {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  subcategory: string;
  stock_total: number;
  selling_price: number;
  size: string;
  quantity: number;
  alert_level: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'OK';
}

interface ConsolidatedAlert {
  productId: string;
  productName: string;
  category: string;
  subcategory: string;
  lowSizes: Array<{
    size: string;
    quantity: number;
    alert_level: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW';
  }>;
  totalStock: number;
  sellingPrice: number;
}

export function ConsolidatedAlerts() {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLowStock();
  }, []);

  const fetchLowStock = async () => {
    try {
      const { data, error } = await supabase
        .from('low_stock_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setLowStockItems(data || []);
    } catch (error) {
      console.error('Error fetching low stock:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group items by product (one alert per product)
  const consolidatedAlerts = useMemo(() => {
    const grouped = new Map<string, ConsolidatedAlert>();
    
    lowStockItems.forEach(item => {
      if (!grouped.has(item.id)) {
        grouped.set(item.id, {
          productId: item.id,
          productName: item.name,
          category: item.category,
          subcategory: item.subcategory,
          lowSizes: [],
          totalStock: item.stock_total,
          sellingPrice: item.selling_price
        });
      }
      
      grouped.get(item.id)!.lowSizes.push({
        size: item.size,
        quantity: item.quantity,
        alert_level: item.alert_level
      });
    });
    
    return Array.from(grouped.values())
      .sort((a, b) => {
        // Sort by severity: out of stock first, then critical, then low
        const aHasOutOfStock = a.lowSizes.some(s => s.alert_level === 'OUT_OF_STOCK');
        const bHasOutOfStock = b.lowSizes.some(s => s.alert_level === 'OUT_OF_STOCK');
        if (aHasOutOfStock && !bHasOutOfStock) return -1;
        if (!aHasOutOfStock && bHasOutOfStock) return 1;
        
        const aHasCritical = a.lowSizes.some(s => s.alert_level === 'CRITICAL');
        const bHasCritical = b.lowSizes.some(s => s.alert_level === 'CRITICAL');
        if (aHasCritical && !bHasCritical) return -1;
        if (!aHasCritical && bHasCritical) return 1;
        
        return a.totalStock - b.totalStock;
      });
  }, [lowStockItems]);

  const getAlertIcon = (alert: ConsolidatedAlert) => {
    const hasOutOfStock = alert.lowSizes.some(s => s.alert_level === 'OUT_OF_STOCK');
    if (hasOutOfStock) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    
    const hasCritical = alert.lowSizes.some(s => s.alert_level === 'CRITICAL');
    if (hasCritical) return <AlertTriangle className="w-5 h-5 text-rose-600" />;
    
    return <TrendingDown className="w-5 h-5 text-amber-600" />;
  };

  const getAlertColor = (alert: ConsolidatedAlert) => {
    const hasOutOfStock = alert.lowSizes.some(s => s.alert_level === 'OUT_OF_STOCK');
    if (hasOutOfStock) return 'bg-red-50 border-red-200';
    
    const hasCritical = alert.lowSizes.some(s => s.alert_level === 'CRITICAL');
    if (hasCritical) return 'bg-rose-50 border-rose-200';
    
    return 'bg-amber-50 border-amber-200';
  };

  const getSizeColor = (level: string) => {
    switch (level) {
      case 'OUT_OF_STOCK':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'LOW':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
          <div className="h-4 bg-slate-100 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (consolidatedAlerts.length === 0) {
    return (
      <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-black text-emerald-900 text-lg">
              ¡Todo en orden! ✅
            </h3>
            <p className="text-emerald-700 text-sm">
              No hay productos con stock bajo
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg">
            Alertas de Stock Bajo
          </h3>
          <p className="text-slate-600 text-sm">
            {consolidatedAlerts.length} {consolidatedAlerts.length === 1 ? 'producto necesita' : 'productos necesitan'} reposición
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {consolidatedAlerts.map((alert) => (
          <div
            key={alert.productId}
            className={`rounded-2xl border p-4 ${getAlertColor(alert)}`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">
                  {getAlertIcon(alert)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase leading-tight mb-1">
                    {alert.productName}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-600">
                      {alert.category}
                    </span>
                    {alert.subcategory && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span className="text-[10px] font-bold uppercase text-slate-600">
                          {alert.subcategory}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black text-slate-900 leading-none">
                  ${alert.sellingPrice.toLocaleString('es-AR')}
                </div>
              </div>
            </div>

            {/* Size boxes showing low stock */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {alert.lowSizes.map(({ size, quantity, alert_level }) => (
                <div 
                  key={size}
                  className={`rounded-xl border px-2 py-1.5 text-center ${getSizeColor(alert_level)}`}
                >
                  <div className="text-[10px] font-black uppercase opacity-70 mb-0.5">
                    {size}
                  </div>
                  <div className="text-sm font-black">
                    {quantity}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-600 font-bold">
              Total: {alert.totalStock} {alert.totalStock === 1 ? 'unidad' : 'unidades'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
