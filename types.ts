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

// Interfaz para la base de datos (snake_case)
export interface Sale {
  id: string;
  date: string;
  client_number: string; // ID Semántico: V260109-001, S... o C...
  product_name: string;
  quantity: number;
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

export interface InventoryItem {
  id: string;
  name: string;
  category: ProductCategory;
  subcategory: string;
  material: string;
  sizes: Record<string, number>; // JSONB: { "M": 5, "L": 2 }
  cost_price: number;
  selling_price: number;
  last_updated: string;
  synced: boolean;
}

// ============================================
// ESTRUCTURAS PARA EL NUEVO POS (CARRITO)
// ============================================

export interface CartItem {
  id: string; // ID temporal o ID real de DB si estamos editando
  product: string;
  quantity: number;
  price: number;
  size: string;
  inventory_id?: string;
  cost_price: number;
  isReturn?: boolean; 
}

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
}

export interface MultiSaleData {
  date: string;
  items: CartItem[];
  payments: PaymentSplit[];
  // Campos para el modo edición
  isEdit?: boolean;
  originalClientNumber?: string;
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

export type Tab = 'form' | 'list' | 'expenses' | 'inventory' | 'stats' | 'settings';

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