export type PaymentMethod = 
  | 'Efectivo - 10%'
  | 'Efectivo'
  | 'Crédito 1 Cuota'
  | 'Crédito 3 Cuotas'
  | 'Débito'
  | 'Transferencia';

export type ExpenseCategory = 
  | 'Mercadería'
  | 'Alquiler/Fijos'
  | 'Impuestos/Servicios'
  | 'Otros';

export type ProductCategory = string;

// Reflejamos los campos de la base de datos (snake_case)
export interface Sale {
  id: string;
  date: string;
  client_number: string;
  product_name: string;
  quantity: number;
  sale_number?: number; 
  price: number;
  cost_price: number;
  payment_method: PaymentMethod;
  category?: string;
  material?: string;
  size?: string;
  notes?: string;
  synced: boolean; 
  created_at: string;
  inventory_id?: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  has_invoice_a: boolean;
  invoice_percentage: number;
  synced: boolean;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ProductCategory;
  subcategory: string;
  material: string;
  sizes: Record<string, number>;
  stock: number; 
  cost_price: number;
  selling_price: number;
  last_updated: string;
  synced: boolean;
}

export interface SaleFormData {
  date: string;
  clientNumber: string;
  product: string;
  quantity: string;
  price: string;
  paymentMethod: PaymentMethod;
  size: string;
  notes: string;
}

export interface ExpenseFormData {
  date: string;
  description: string;
  amount: string;
  category: ExpenseCategory;
  hasInvoiceA: boolean;
  invoicePercentage: string;
}

export interface InventoryFormData {
  name: string;
  category: ProductCategory;
  subcategory: string;
  material: string;
  sizes: Record<string, string>;
  costPrice: string;
  sellingPrice: string;
}

export interface AppConfig {
  categories: string[];
  subcategories: Record<string, string[]>;
  materials: string[];
}

export type Tab = 'form' | 'list' | 'expenses' | 'inventory' | 'stats' | 'settings';
