import React, { useEffect, useState } from 'react';
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

export function LowStockAlert() {
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
        .order('quantity', { ascending: true });

      if (error) throw error;
      setLowStockItems(data || []);
    } catch (error) {
      console.error('Error fetching low stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'OUT_OF_STOCK':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'CRITICAL':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'LOW':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'OUT_OF_STOCK':
        return <AlertTriangle className="w-5 h-5" />;
      case 'CRITICAL':
      case 'LOW':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
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

  if (lowStockItems.length === 0) {
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
            {lowStockItems.length} {lowStockItems.length === 1 ? 'producto necesita' : 'productos necesitan'} reposición
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {lowStockItems.map((item) => (
          <div
            key={`${item.id}-${item.size}`}
            className={`rounded-2xl border p-4 ${getAlertColor(item.alert_level)}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">
                  {getAlertIcon(item.alert_level)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase leading-tight mb-1">
                    {item.name}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[10px] font-bold uppercase opacity-70">
                      Talle {item.size}
                    </span>
                    {item.sku && (
                      <span className="text-[10px] font-mono opacity-70">
                        SKU: {item.sku}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold">
                      Stock: {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                    </span>
                    <span className="opacity-50">•</span>
                    <span className="font-bold opacity-70">
                      ${item.selling_price.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide ${
                item.alert_level === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' :
                item.alert_level === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {item.alert_level === 'OUT_OF_STOCK' ? 'Sin Stock' :
                 item.alert_level === 'CRITICAL' ? 'Crítico' :
                 'Bajo'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
