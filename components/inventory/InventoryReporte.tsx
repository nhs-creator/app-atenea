import React from 'react';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { InventoryItem } from '../../types';
import { useInventoryMetrics } from '../../hooks/useInventoryMetrics';
import { ConsolidatedAlerts } from './ConsolidatedAlerts';
import InventoryCharts from './InventoryCharts';

interface InventoryReporteProps {
  inventory: InventoryItem[];
}

const InventoryReporte: React.FC<InventoryReporteProps> = ({ inventory }) => {
  const metrics = useInventoryMetrics(inventory);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Section 1: Alertas de Stock */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Alertas de Stock
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Productos que necesitan reposición
              </p>
            </div>
          </div>
        </div>
        <ConsolidatedAlerts />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-slate-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 px-4 py-1 text-xs font-black text-slate-400 uppercase tracking-widest">
            Analytics
          </span>
        </div>
      </div>

      {/* Section 2: Análisis y Gráficos */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Análisis de Inventario
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Métricas y visualización de datos
              </p>
            </div>
          </div>
        </div>
        <InventoryCharts metrics={metrics} />
      </div>
    </div>
  );
};

export default InventoryReporte;
