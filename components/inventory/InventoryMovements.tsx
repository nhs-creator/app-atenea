import React, { useEffect, useState } from 'react';
import { History, TrendingUp, TrendingDown, Package, AlertCircle, ArrowRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Movement {
  id: string;
  inventory_id: string;
  user_id: string;
  movement_type: 'sale' | 'return' | 'restock' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'initial' | 'cancel';
  size: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

interface InventoryMovementsProps {
  inventoryId: string;
  inventoryName: string;
  onClose: () => void;
}

export function InventoryMovements({ inventoryId, inventoryName, onClose }: InventoryMovementsProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, [inventoryId]);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('inventory_id', inventoryId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'return':
      case 'restock':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'adjustment':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'initial':
        return <Package className="w-4 h-4 text-slate-600" />;
      default:
        return <ArrowRight className="w-4 h-4 text-slate-600" />;
    }
  };

  const getMovementLabel = (type: string) => {
    const labels: Record<string, string> = {
      sale: 'Venta',
      return: 'Devolución',
      restock: 'Reposición',
      adjustment: 'Ajuste',
      transfer_in: 'Transferencia Entrada',
      transfer_out: 'Transferencia Salida',
      initial: 'Stock Inicial',
      cancel: 'Cancelación'
    };
    return labels[type] || type;
  };

  const getMovementColor = (change: number) => {
    if (change > 0) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (change < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Hoy ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Ayer ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('es-AR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <History className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-xl">
                Historial de Movimientos
              </h2>
              <p className="text-slate-600 text-sm font-bold uppercase">
                {inventoryName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-bold">
                No hay movimientos registrados aún
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="bg-slate-50 rounded-2xl border border-slate-100 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        {getMovementIcon(movement.movement_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-sm text-slate-900">
                            {getMovementLabel(movement.movement_type)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Talle {movement.size}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          {formatDate(movement.created_at)}
                        </p>
                        {movement.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            {movement.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`rounded-xl border px-3 py-1.5 text-center ${getMovementColor(movement.quantity_change)}`}>
                      <div className="text-xs font-black">
                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                      </div>
                    </div>
                  </div>

                  {/* Stock change visualization */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-slate-600">
                      {movement.quantity_before}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-mono font-bold text-slate-900">
                      {movement.quantity_after}
                    </span>
                    <span className="text-slate-500 ml-1">unidades</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with summary */}
        {movements.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-emerald-600">
                  {movements.filter(m => m.quantity_change > 0).length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase">
                  Entradas
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-red-600">
                  {movements.filter(m => m.quantity_change < 0).length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase">
                  Salidas
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">
                  {movements.length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase">
                  Total
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
