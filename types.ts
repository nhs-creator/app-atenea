export type PaymentBaseMethod = 
  | 'Efectivo' 
  | 'Transferencia' 
  | 'Débito' 
  | 'Crédito' 
  | 'Vale';

export type SaleStatus = 'completed' | 'pending' | 'cancelled';

export type ExpenseCategory = 
  | 'Mercadería'
  | 'Alquiler/Fijos'
  | 'Impuestos/Servicios'
  | 'Otros';

export type ProductCategory = string;

// --- ESTRUCTURA DE PAGOS DETALLADA ---
export interface PaymentSplit {
  method: PaymentBaseMethod;
  amount: number;
  installments?: number; // Cuotas: 1, 3, 6, 12...
  isRounding?: boolean; 
  voucherCode?: string; 
  appliedToItems?: string[]; 
}

// --- ESTRUCTURA DE CARRITO PROFESIONAL ---
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

// --- INTERFAZ DE VALES (VOUCHERS) ---
export interface Voucher {
  id: string;
  code: string;
  initial_amount: number;
  current_amount: number;
  status: 'active' | 'used' | 'expired';
  expires_at: string;
  created_at: string;
}

// --- DATOS PARA EL PROCESO DE CARGA ---
export interface MultiSaleData {
  date: string;
  items: CartItem[];
  payments: PaymentSplit[];
  isEdit?: boolean;
  originalClientNumber?: string;
  status?: SaleStatus;
}

export interface ExpenseFormData {
  id?: string;
  date: string;
  description: string;
  amount: string;
  category: ExpenseCategory;
  hasInvoiceA: boolean;
  invoiceAmount: string;
  isEdit?: boolean;
}

export interface Sale {
  id: string;
  user_id: string;
  date: string;
  client_number: string;
  product_name: string;
  quantity: number;
  price: number; 
  list_price: number; 
  cost_price: number;
  payment_method: string; 
  payment_details: PaymentSplit[]; 
  status: SaleStatus;
  size?: string;
  notes?: string;
  inventory_id?: string;
  expires_at?: string; 
  created_at: string;
}

export interface Expense { 
  id: string; 
  date: string; 
  description: string; 
  amount: number; 
  category: ExpenseCategory; 
  has_invoice_a: boolean; 
  invoice_amount: number; 
  synced: boolean; 
  created_at: string;
  updated_at: string; 
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ProductCategory;
  subcategory: string;
  material: string;
  sizes: Record<string, number>;
  cost_price: number;
  selling_price: number;
  last_updated: string;
  synced: boolean;
}

export interface InventoryFormData {
  name: string;
  category: string;
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

export type Tab = 'form' | 'list' | 'inventory' | 'stats' | 'settings';
export type EntryMode = 'sale' | 'expense';