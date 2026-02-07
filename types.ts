export type Tab = 'form' | 'list' | 'inventory' | 'stats' | 'settings' | 'expenses';
export type EntryMode = 'sale' | 'expense';
export type ExpenseType = 'business' | 'personal';

// Definición de los métodos de pago
export type PaymentMethod = 
  | 'Efectivo - 10%'
  | 'Efectivo'
  | 'Crédito 1 Cuota'
  | 'Crédito 3 Cuotas'
  | 'Débito'
  | 'Transferencia'
  | 'Vale';

export type PaymentBaseMethod = 'Efectivo' | 'Transferencia' | 'Débito' | 'Crédito' | 'Vale';

// Categorías finales unificadas
export type ExpenseCategory = 
  | 'Mercadería'
  | 'Alquiler'
  | 'Servicios'
  | 'Impuestos'
  | 'Moratoria'
  | 'Inversión'
  | 'Marketing'
  | 'Otros Negocio'
  | 'Comida/Súper'
  | 'Transporte'
  | 'Ocio/Salidas'
  | 'Salud'
  | 'Vivienda'
  | 'Suscripciones'
  | 'Otros Personal';

export interface ExpenseCategoryMetadata {
  id: ExpenseCategory;
  icon: any; // LucideIcon type
  type: ExpenseType;
  color: string; // Tailwind color class prefix (e.g. "blue")
  styles: {
    activeClasses: string;
    inactiveClasses: string;
    iconColor: string;
    text: string;
    bg: string;
  };
}

export interface PaymentSplit {
  method: PaymentBaseMethod;
  amount: number;
  installments?: number;
  voucherCode?: string;
  appliedToItems?: string[];
  roundingBase?: 100 | 500 | 1000 | null;
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
  price: number;
  list_price?: number;
  cost_price: number;
  payment_method: string;
  payment_details: PaymentSplit[];
  status: 'completed' | 'pending' | 'cancelled' | 'returned' | 'exchanged';
  size?: string;
  inventory_id?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface Expense {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: ExpenseType; 
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
  type: ExpenseType; 
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
  selling_price: number;
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
  sellingPrice: string;
  sizes: Record<string, number>;
  minStock: string;
}