export type Tab = 'form' | 'list' | 'inventory' | 'stats' | 'settings' | 'expenses' | 'customers';
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
  | 'Expensas'
  | 'Luz'
  | 'Agua'
  | 'Gas'
  | 'ABL'
  | 'Internet'
  | 'Compra de dólares'
  | 'Tarjeta de crédito'
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

export interface Client {
  id: string;
  user_id: string;
  name: string;
  last_name: string;
  phone: string;
  email?: string;
  created_at: string;
  updated_at?: string;
}

export interface MultiSaleData {
  date: string;
  items: CartItem[];
  payments: PaymentSplit[];
  productDraft?: ProductDraft;
  isEdit?: boolean;
  originalClientNumber?: string;
  forceCompleted?: boolean;
  // Para vincular o crear una clienta durante la venta
  clientId?: string;
  clientDraft?: {
    name: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  sendWhatsApp?: boolean;
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
  client_id?: string; // Relación con la tabla clients
  client_name?: string; // Para mostrar sin JOIN
  client_phone?: string; // Para mostrar sin JOIN
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
  stock_total: number;
  min_stock?: number;
  image_url?: string;
  sku?: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
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

/** Días de la semana: 0=Domingo, 1=Lunes, ..., 6=Sábado (getDay de JS) */
export const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

export interface AppConfig {
  categories: string[];
  subcategories: Record<string, string[]>;
  materials: string[];
  /** Size systems: name -> array of size labels (e.g. { "LETRAS": ["S","M","L"], "UNICO": ["U"] }) */
  sizeSystems: Record<string, string[]>;
  /** Which size system each category uses (e.g. { "Prendas Superiores": "LETRAS" }) */
  categorySizeMap: Record<string, string>;
  /** Días en que abre el local: 0=Domingo, 1=Lunes, ..., 6=Sábado. Usado por Stats para el gráfico de tendencia. */
  openDays?: number[];
}

export interface InventoryFormData {
  name: string;
  category: string;
  subcategory: string;
  material: string;
  costPrice: string;
  sellingPrice: string;
  sizes: Record<string, number>;
  minStock?: string;
  sku?: string;
  barcode?: string;
}