import React, { useState } from 'react';
import { Sale, Expense, InventoryItem, AppConfig } from '../types';
import { useStatsMetrics, Period } from '../hooks/useStatsMetrics';

import StatsHeader from './stats/StatsHeader';
import StatsSummary from './stats/StatsSummary';
import StatsBreakdown from './stats/StatsBreakdown';
import StatsCharts from './stats/StatsCharts';
import StatsDollarPurchases from './stats/StatsDollarPurchases';

interface StatsViewProps {
  sales: Sale[];
  expenses: Expense[];
  inventory: InventoryItem[];
  config?: AppConfig;
}

const StatsView: React.FC<StatsViewProps> = ({ sales = [], expenses = [], inventory = [], config }) => {
  const [period, setPeriod] = useState<Period>('today');
  const [viewMode, setViewMode] = useState<'business' | 'personal'>('business');
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());

  // Funciones de navegación de meses
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

  const openDays = config?.openDays ?? [1, 2, 3, 4, 5, 6]; // Lunes-Sábado por defecto

  const { 
    metrics, 
    topBusinessExpenses, 
    topPersonalExpenses,
    dollarPurchases 
  } = useStatsMetrics(sales, expenses, period, selectedMonthDate, openDays);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      <StatsHeader 
        period={period}
        onPeriodChange={setPeriod}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedMonthDate={selectedMonthDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />

      <StatsSummary 
        viewMode={viewMode}
        metrics={metrics}
      />

      {viewMode === 'business' && (
        <StatsCharts 
          totalSales={metrics.totalSales}
          digitalRevenue={metrics.digitalRevenue}
          businessExpenses={metrics.businessExpenses}
          salesTrend={metrics.salesTrend}
          paymentDistribution={metrics.paymentDistribution}
          paymentTotals={metrics.paymentTotals}
          showOnly="trend_and_payments"
        />
      )}

      <StatsBreakdown 
        viewMode={viewMode}
        topExpenses={viewMode === 'business' ? topBusinessExpenses : topPersonalExpenses}
        totalExpenses={viewMode === 'business' ? metrics.businessExpenses : metrics.personalWithdrawals}
        excludeFromTotal={viewMode === 'personal' ? (dollarPurchases?.totalArs ?? 0) : 0}
      />

      {viewMode === 'personal' && (
        <StatsDollarPurchases
          items={dollarPurchases?.items ?? []}
          totalUsd={dollarPurchases?.totalUsd ?? 0}
          totalArs={dollarPurchases?.totalArs ?? 0}
          avgRate={dollarPurchases?.avgRate ?? 0}
        />
      )}

      {viewMode === 'business' && (
        <StatsCharts 
          totalSales={metrics.totalSales}
          digitalRevenue={metrics.digitalRevenue}
          businessExpenses={metrics.businessExpenses}
          salesTrend={metrics.salesTrend}
          paymentDistribution={metrics.paymentDistribution}
          paymentTotals={metrics.paymentTotals}
          showOnly="efficiency"
        />
      )}

    </div>
  );
};

export default StatsView;