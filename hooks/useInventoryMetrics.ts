import { useMemo } from 'react';
import { InventoryItem, Sale } from '../types';

export interface InventoryMetrics {
  totalValue: number;
  totalRetailValue: number;
  valueByCategory: Array<{ category: string; value: number }>;
  stockByCategory: Array<{ category: string; stock: number }>;
  topProducts: Array<{ name: string; value: number; stock: number }>;
  sizeDistribution: Array<{ size: string; quantity: number }>;
  lowStockCount: number;
  outOfStockCount: number;
  totalProducts: number;
  averageStockPerProduct: number;
  totalUnits: number;
}

export function useInventoryMetrics(inventory: InventoryItem[]): InventoryMetrics {
  return useMemo(() => {
    // Total inventory value (cost)
    const totalValue = inventory.reduce((sum, item) => 
      sum + (item.cost_price * item.stock_total), 0
    );

    // Total retail value (selling price)
    const totalRetailValue = inventory.reduce((sum, item) => 
      sum + (item.selling_price * item.stock_total), 0
    );
    
    // Value by category
    const categoryValueMap = inventory.reduce((acc, item) => {
      const value = item.cost_price * item.stock_total;
      acc[item.category] = (acc[item.category] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const valueByCategory = Object.entries(categoryValueMap)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
    
    // Stock levels by category
    const categoryStockMap = inventory.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.stock_total;
      return acc;
    }, {} as Record<string, number>);

    const stockByCategory = Object.entries(categoryStockMap)
      .map(([category, stock]) => ({ category, stock }))
      .sort((a, b) => b.stock - a.stock);
    
    // Top products by value (cost * stock)
    const topProducts = inventory
      .map(item => ({
        name: item.name,
        value: item.cost_price * item.stock_total,
        stock: item.stock_total
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    // Size distribution
    const sizeMap = inventory.reduce((acc, item) => {
      Object.entries(item.sizes).forEach(([size, qty]) => {
        acc[size] = (acc[size] || 0) + qty;
      });
      return acc;
    }, {} as Record<string, number>);

    const sizeDistribution = Object.entries(sizeMap)
      .map(([size, quantity]) => ({ size, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
    
    // Low stock count (more than 0 but <= 5 units total)
    const lowStockCount = inventory.filter(item => 
      item.stock_total > 0 && item.stock_total <= 5
    ).length;
    
    // Out of stock count
    const outOfStockCount = inventory.filter(item => 
      item.stock_total === 0
    ).length;

    // Total units across all products
    const totalUnits = inventory.reduce((sum, item) => 
      sum + item.stock_total, 0
    );

    // Average stock per product
    const averageStockPerProduct = inventory.length > 0 
      ? totalUnits / inventory.length 
      : 0;
    
    return {
      totalValue,
      totalRetailValue,
      valueByCategory,
      stockByCategory,
      topProducts,
      sizeDistribution,
      lowStockCount,
      outOfStockCount,
      totalProducts: inventory.length,
      averageStockPerProduct,
      totalUnits
    };
  }, [inventory]);
}
