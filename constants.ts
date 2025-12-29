import { PaymentMethod, ExpenseCategory } from './types';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo - 10%',
  'Efectivo',
  'Crédito 1 Cuota',
  'Crédito 3 Cuotas',
  'Débito',
  'Transferencia',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Mercadería',
  'Alquiler/Fijos',
  'Impuestos/Servicios',
  'Otros',
];

// Sistemas de talles
export const SIZE_SYSTEMS = {
  LETRAS: ['S', 'M', 'L', 'XL', 'XXL', 'U'],
  NUMEROS_ROPA: ['36', '38', '40', '42', '44', '46', '48', '50'],
  NUMEROS_CALZADO: ['35', '36', '37', '38', '39', '40', '41'],
  UNICO: ['U']
};

export const CATEGORY_SIZE_MAP: Record<string, keyof typeof SIZE_SYSTEMS> = {
  'Tejidos y Abrigos': 'LETRAS',
  'Prendas Superiores': 'LETRAS',
  'Prendas Inferiores': 'NUMEROS_ROPA',
  'Piezas Enteras': 'LETRAS',
  'Accesorios': 'UNICO',
  'Marroquinería': 'UNICO',
  'Bijouterie': 'UNICO',
  'Hogar/Home': 'UNICO',
  'Otros': 'UNICO'
};

// Valores por defecto para inicialización
export const DEFAULT_PRODUCT_CATEGORIES: string[] = [
  'Tejidos y Abrigos',
  'Prendas Superiores',
  'Prendas Inferiores',
  'Piezas Enteras',
  'Accesorios',
  'Marroquinería',
  'Bijouterie',
  'Hogar/Home',
  'Otros'
];

export const DEFAULT_CATEGORY_MAP: Record<string, string[]> = {
  'Tejidos y Abrigos': ['Suéteres', 'Poleras', 'Cardigans', 'Chalecos', 'Abrigos', 'Buzos'],
  'Prendas Superiores': ['Remeras', 'Musculosas', 'Blusas', 'Camisas', 'Bodys'],
  'Prendas Inferiores': ['Jeans', 'Pantalones', 'Shorts', 'Polleras'],
  'Piezas Enteras': ['Vestidos', 'Enteritos'],
  'Accesorios': ['Cuello/Cabeza', 'Manos', 'Complementos'],
  'Marroquinería': ['Bolsos Grandes', 'Bolsos Pequeños', 'Pequeña Marroquinería'],
  'Bijouterie': ['Joyería'],
  'Hogar/Home': ['Aromas', 'Deco'],
  'Otros': ['Varios']
};

export const DEFAULT_MATERIALS = [
  'Lana', 'Hilo', 'Bremer', 'Lanilla', 'Modal', 'Algodón', 'Morley', 
  'Lino', 'Crepé', 'Sastrero', 'Denim/Jean', 'Poplín', 'Tuill', 'Broderi'
];

export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, { bg: string, text: string, dot: string }> = {
  'Efectivo - 10%': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Efectivo': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Crédito 1 Cuota': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  'Crédito 3 Cuotas': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  'Débito': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Transferencia': { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
};

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, { bg: string, text: string, iconColor: string }> = {
  'Mercadería': { bg: 'bg-blue-100', text: 'text-blue-700', iconColor: 'text-blue-500' },
  'Alquiler/Fijos': { bg: 'bg-purple-100', text: 'text-purple-700', iconColor: 'text-purple-500' },
  'Impuestos/Servicios': { bg: 'bg-orange-100', text: 'text-orange-700', iconColor: 'text-orange-500' },
  'Otros': { bg: 'bg-slate-100', text: 'text-slate-700', iconColor: 'text-slate-500' },
};

export const STORAGE_KEYS = {
  SALES: 'boutique_sales_data',
  EXPENSES: 'boutique_expenses_data',
  INVENTORY: 'boutique_inventory_data',
  CONFIG: 'boutique_app_config',
};