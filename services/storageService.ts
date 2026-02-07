import { Sale, Expense, InventoryItem, AppConfig } from '../types';
import { STORAGE_KEYS, DEFAULT_PRODUCT_CATEGORIES, DEFAULT_CATEGORY_MAP, DEFAULT_MATERIALS, DEFAULT_SIZE_SYSTEMS, DEFAULT_CATEGORY_SIZE_MAP } from '../constants';

const SESSION_KEY = 'boutique_last_session';

export const saveSalesLocally = (sales: Sale[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  } catch (error) {
    console.error('Error saving sales to localStorage', error);
  }
};

export const getSalesLocally = (): Sale[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SALES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading sales from localStorage', error);
    return [];
  }
};

export const saveExpensesLocally = (expenses: Expense[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  } catch (error) {
    console.error('Error saving expenses to localStorage', error);
  }
};

export const getExpensesLocally = (): Expense[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading expenses from localStorage', error);
    return [];
  }
};

export const saveInventoryLocally = (inventory: InventoryItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  } catch (error) {
    console.error('Error saving inventory to localStorage', error);
  }
};

export const getInventoryLocally = (): InventoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading inventory from localStorage', error);
    return [];
  }
};

export const saveConfigLocally = (config: AppConfig): void => {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
};

export const getConfigLocally = (): AppConfig => {
  const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
  if (!data) {
    return { 
      categories: DEFAULT_PRODUCT_CATEGORIES,
      subcategories: DEFAULT_CATEGORY_MAP,
      materials: DEFAULT_MATERIALS,
      sizeSystems: DEFAULT_SIZE_SYSTEMS,
      categorySizeMap: DEFAULT_CATEGORY_SIZE_MAP
    };
  }
  const config = JSON.parse(data);
  return {
    ...config,
    categories: config.categories || DEFAULT_PRODUCT_CATEGORIES,
    subcategories: config.subcategories || DEFAULT_CATEGORY_MAP,
    materials: config.materials || DEFAULT_MATERIALS,
    sizeSystems: config.sizeSystems || DEFAULT_SIZE_SYSTEMS,
    categorySizeMap: config.categorySizeMap || DEFAULT_CATEGORY_SIZE_MAP
  };
};

export const saveLastSession = (data: { clientNumber: string; paymentMethod: string; date: string }): void => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
};

export const getLastSession = () => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};
