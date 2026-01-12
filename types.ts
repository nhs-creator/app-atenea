export type Tab = 'form' | 'list' | 'inventory' | 'stats' | 'settings';
export type EntryMode = 'sale' | 'expense';

export type PaymentBaseMethod = 'Efectivo' | 'Transferencia' | 'Débito' | 'Crédito' | 'Vale';

export interface PaymentSplit {
  method: PaymentBaseMethod;
  amount: number;
  installments?: number;
  voucherCode?: string;
  appliedToItems?: string[];
  roundingBase?: 100 | 500 | 1000 | null; // IDs de productos del carrito que tienen descuento
}

export interface CartItem {
  id: string;
  product: string;
  quantity: number;
  listPrice: number;
  finalPrice: number;
  size: string;
  inventory_id?: string;
  cost_price: number;
  isReturn?: boolean;
}

export interface ProductDraft {
  name: string;
  price: string;
  quantity: string;
  size: string;
  inventoryId: string;
}

export interface MultiSaleData {
  date: string;
  items: CartItem[];
  payments: PaymentSplit[];
  productDraft?: ProductDraft;
  isEdit?: boolean;
  originalClientNumber?: string;
  forceCompleted?: boolean;
}

export interface Sale {
  id: string;
  user_id: string;
  date: string;
  client_number: string;
  product_name: string;
  quantity: number;
  price: number; // Este es el precio final cobrado
  list_price?: number; // Precio de lista original
  cost_price: number;
  payment_method: string;
  payment_details: PaymentSplit[];
  status: 'completed' | 'pending' | 'cancelled' | 'returned' | 'exchanged';
  size?: string;
  inventory_id?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string; // Para vencimiento de señas o vales
}

export interface Expense {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  has_invoice_a: boolean;
  invoice_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFormData {
  id?: string;
  date: string;
  description: string;
  amount: string;
  category: string;
  hasInvoiceA: boolean;
  invoiceAmount: string;
  isEdit?: boolean;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  subcategory: string;
  material: string;
  cost_price: number;
  list_price: number;
  sizes: Record<string, number>;
  min_stock: number;
  image_url?: string;
  created_at: string;
}

export interface Voucher {
  id: string;
  user_id: string;
  code: string;
  initial_amount: number;
  current_amount: number;
  status: 'active' | 'used' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface AppConfig {
  categories: string[];
  subcategories: Record<string, string[]>;
  materials: string[];
}

export interface InventoryFormData {
  name: string;
  category: string;
  subcategory: string;
  material: string;
  costPrice: string;
  listPrice: string;
  sizes: Record<string, number>;
  minStock: string;
}