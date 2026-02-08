import { useMemo } from 'react';
import { Sale, Expense, InventoryItem, ExpenseCategory } from '../types';
import { CATEGORY_METADATA } from '../constants';

export type Period = 'today' | 'yesterday' | 'week' | 'month';

export const useStatsMetrics = (
  sales: Sale[], 
  expenses: Expense[], 
  period: Period, 
  selectedMonthDate: Date
) => {
  return useMemo(() => {
    // 1. Helpers de Fecha (Argentina)
    const getARDateStr = (date: Date) => {
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(date);
    };

    const now = new Date();
    const todayStr = getARDateStr(now);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getARDateStr(yesterday);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
    const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const filterByTime = (dateStr: string) => {
      if (period === 'today') return dateStr === todayStr;
      if (period === 'yesterday') return dateStr === yesterdayStr;
      const d = new Date(dateStr + 'T12:00:00');
      if (period === 'week') return d >= weekAgo;
      if (period === 'month') return d >= startOfMonth && d <= endOfMonth;
      return true;
    };

    // 2. Generar eje de tiempo completo para la tendencia (evita huecos)
    const trendLabels: string[] = [];
    if (period === 'today') trendLabels.push(todayStr);
    else if (period === 'yesterday') trendLabels.push(yesterdayStr);
    else if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        trendLabels.push(getARDateStr(d));
      }
    } else if (period === 'month') {
      const daysInMonth = endOfMonth.getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), i);
        trendLabels.push(getARDateStr(d));
      }
    }

    const salesByDay: Record<string, number> = {};
    trendLabels.forEach(label => salesByDay[label] = 0);

    // 3. Cálculos de Ventas e Ingresos
    const filteredSales = sales.filter(s => filterByTime(s.date));
    let totalSales = 0;
    const paymentTotals: Record<string, number> = { 
      'Efectivo': 0, 'Transferencia': 0, 'Débito': 0, 'Crédito': 0, 'Vale': 0 
    };
    const processedTransactions = new Set<string>();

    filteredSales.forEach(s => {
      const price = Number(s.price) || 0;
      const qty = s.quantity || 1;
      const subtotal = (s.product_name === '💰 AJUSTE POR REDONDEO') ? price : (price * qty);
      
      totalSales += subtotal;
      if (salesByDay[s.date] !== undefined) salesByDay[s.date] += subtotal;

      if (!processedTransactions.has(s.client_number)) {
        let details = s.payment_details;
        if (typeof details === 'string') try { details = JSON.parse(details); } catch { details = []; }

        if (Array.isArray(details) && details.length > 0) {
          details.forEach((p: any) => {
            if (paymentTotals[p.method] !== undefined) paymentTotals[p.method] += Number(p.amount) || 0;
          });
          processedTransactions.add(s.client_number);
        } else {
          const method = s.payment_method || 'Efectivo';
          if (paymentTotals[method] !== undefined) paymentTotals[method] += subtotal;
        }
      }
    });

    // 4. Cálculos de Gastos
    const filteredExpenses = expenses.filter(e => filterByTime(e.date));
    let businessExpenses = 0;
    let personalWithdrawals = 0;
    const businessCategoryTotals: Record<string, number> = {};
    const personalCategoryTotals: Record<string, number> = {};

    filteredExpenses.forEach(e => {
      const amount = Number(e.amount) || 0;
      const meta = CATEGORY_METADATA[e.category as ExpenseCategory];
      const isPersonal = e.type === 'personal' || (meta?.type === 'personal');
      
      if (isPersonal) {
        personalWithdrawals += amount;
        personalCategoryTotals[e.category] = (personalCategoryTotals[e.category] || 0) + amount;
      } else {
        businessExpenses += amount;
        businessCategoryTotals[e.category] = (businessCategoryTotals[e.category] || 0) + amount;
      }
    });

    const digitalRevenue = (paymentTotals['Transferencia'] || 0) + (paymentTotals['Débito'] || 0) + (paymentTotals['Crédito'] || 0);
    const netProfit = totalSales - businessExpenses;
    const finalBalance = netProfit - personalWithdrawals;

    const salesTrend = trendLabels.map(label => ({
      date: label.split('-').slice(2).join('/') + (period === 'month' ? '' : `/${label.split('-')[1]}`),
      amount: salesByDay[label]
    }));

    const paymentDistribution = Object.entries(paymentTotals)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);

    const sortCategories = (totals: Record<string, number>) => 
      Object.entries(totals).sort(([, a], [, b]) => b - a).filter(([, amount]) => amount > 0);

    return {
      metrics: {
        totalSales, paymentTotals, digitalRevenue,
        businessExpenses, personalWithdrawals,
        netProfit, finalBalance,
        salesTrend,
        paymentDistribution
      },
      topBusinessExpenses: sortCategories(businessCategoryTotals).map(([name, value]) => ({ name, value })),
      topPersonalExpenses: sortCategories(personalCategoryTotals).map(([name, value]) => ({ name, value })),
      totalExpenses: businessExpenses + personalWithdrawals
    };
  }, [sales, expenses, period, selectedMonthDate]);
};