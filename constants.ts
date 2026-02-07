import { 
  Package, Home, Zap, Landmark, History, Hammer, User, 
  ShoppingCart, Bus, Heart, Coffee, Briefcase, 
  Megaphone, Clock, Tag
} from 'lucide-react';
import { PaymentMethod, ExpenseCategory, ExpenseCategoryMetadata } from './types';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo - 10%',
  'Efectivo',
  'Crédito 1 Cuota',
  'Crédito 3 Cuotas',
  'Débito',
  'Transferencia',
  'Vale',
];

// Unified Category Metadata with Explicit Tailwind Classes for reliable extraction
export const CATEGORY_METADATA: Record<ExpenseCategory, ExpenseCategoryMetadata> = {
  // Business Categories
  'Mercadería': { 
    id: 'Mercadería', icon: Package, type: 'business', color: 'blue',
    styles: {
      activeClasses: 'bg-blue-600 border-2 border-blue-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md',
      iconColor: 'text-blue-600', text: 'text-blue-700', bg: 'bg-blue-100'
    }
  },
  'Alquiler': { 
    id: 'Alquiler', icon: Home, type: 'business', color: 'orange',
    styles: {
      activeClasses: 'bg-orange-600 border-2 border-orange-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-md',
      iconColor: 'text-orange-600', text: 'text-orange-700', bg: 'bg-orange-100'
    }
  },
  'Servicios': { 
    id: 'Servicios', icon: Zap, type: 'business', color: 'yellow',
    styles: {
      activeClasses: 'bg-yellow-500 border-2 border-yellow-600 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-yellow-300 hover:bg-yellow-50/50 hover:shadow-md',
      iconColor: 'text-yellow-600', text: 'text-yellow-700', bg: 'bg-yellow-100'
    }
  },
  'Impuestos': { 
    id: 'Impuestos', icon: Landmark, type: 'business', color: 'slate',
    styles: {
      activeClasses: 'bg-slate-700 border-2 border-slate-800 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-md',
      iconColor: 'text-slate-600', text: 'text-slate-700', bg: 'bg-slate-100'
    }
  },
  'Moratoria': { 
    id: 'Moratoria', icon: History, type: 'business', color: 'rose',
    styles: {
      activeClasses: 'bg-rose-600 border-2 border-rose-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-rose-300 hover:bg-rose-50/50 hover:shadow-md',
      iconColor: 'text-rose-600', text: 'text-rose-700', bg: 'bg-rose-100'
    }
  },
  'Inversión': { 
    id: 'Inversión', icon: Hammer, type: 'business', color: 'violet',
    styles: {
      activeClasses: 'bg-violet-600 border-2 border-violet-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-violet-300 hover:bg-violet-50/50 hover:shadow-md',
      iconColor: 'text-violet-600', text: 'text-violet-700', bg: 'bg-violet-100'
    }
  },
  'Marketing': { 
    id: 'Marketing', icon: Megaphone, type: 'business', color: 'cyan',
    styles: {
      activeClasses: 'bg-cyan-600 border-2 border-cyan-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-cyan-300 hover:bg-cyan-50/50 hover:shadow-md',
      iconColor: 'text-cyan-600', text: 'text-cyan-700', bg: 'bg-cyan-100'
    }
  },
  'Otros Negocio': { 
    id: 'Otros Negocio', icon: Briefcase, type: 'business', color: 'indigo',
    styles: {
      activeClasses: 'bg-indigo-600 border-2 border-indigo-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md',
      iconColor: 'text-indigo-600', text: 'text-indigo-700', bg: 'bg-indigo-100'
    }
  },

  // Personal Categories
  'Comida/Súper': { 
    id: 'Comida/Súper', icon: ShoppingCart, type: 'personal', color: 'emerald',
    styles: {
      activeClasses: 'bg-emerald-600 border-2 border-emerald-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md',
      iconColor: 'text-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-100'
    }
  },
  'Transporte': { 
    id: 'Transporte', icon: Bus, type: 'personal', color: 'amber',
    styles: {
      activeClasses: 'bg-amber-600 border-2 border-amber-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-amber-300 hover:bg-amber-50/50 hover:shadow-md',
      iconColor: 'text-amber-600', text: 'text-amber-700', bg: 'bg-amber-100'
    }
  },
  'Ocio/Salidas': { 
    id: 'Ocio/Salidas', icon: Coffee, type: 'personal', color: 'rose',
    styles: {
      activeClasses: 'bg-rose-600 border-2 border-rose-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-rose-300 hover:bg-rose-50/50 hover:shadow-md',
      iconColor: 'text-rose-600', text: 'text-rose-700', bg: 'bg-rose-100'
    }
  },
  'Salud': { 
    id: 'Salud', icon: Heart, type: 'personal', color: 'red',
    styles: {
      activeClasses: 'bg-red-600 border-2 border-red-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-red-300 hover:bg-red-50/50 hover:shadow-md',
      iconColor: 'text-red-600', text: 'text-red-700', bg: 'bg-red-100'
    }
  },
  'Vivienda': { 
    id: 'Vivienda', icon: Home, type: 'personal', color: 'teal',
    styles: {
      activeClasses: 'bg-teal-600 border-2 border-teal-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-teal-300 hover:bg-teal-50/50 hover:shadow-md',
      iconColor: 'text-teal-600', text: 'text-teal-700', bg: 'bg-teal-100'
    }
  },
  'Suscripciones': { 
    id: 'Suscripciones', icon: Clock, type: 'personal', color: 'indigo',
    styles: {
      activeClasses: 'bg-indigo-600 border-2 border-indigo-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md',
      iconColor: 'text-indigo-600', text: 'text-indigo-700', bg: 'bg-indigo-100'
    }
  },
  'Otros Personal': { 
    id: 'Otros Personal', icon: User, type: 'personal', color: 'pink',
    styles: {
      activeClasses: 'bg-pink-600 border-2 border-pink-700 shadow-lg scale-105',
      inactiveClasses: 'bg-white border-2 border-slate-100 hover:border-pink-300 hover:bg-pink-50/50 hover:shadow-md',
      iconColor: 'text-pink-600', text: 'text-pink-700', bg: 'bg-pink-100'
    }
  },
};

// Derived lists for easier iteration
export const BUSINESS_CATEGORIES = Object.values(CATEGORY_METADATA)
  .filter(cat => cat.type === 'business');

export const PERSONAL_CATEGORIES = Object.values(CATEGORY_METADATA)
  .filter(cat => cat.type === 'personal');

export const EXPENSE_CATEGORIES = [
  ...BUSINESS_CATEGORIES.map(c => c.id),
  ...PERSONAL_CATEGORIES.map(c => c.id)
];

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

// Re-export from 3-level inventory categorization system
import {
  getCategoriesForConfig,
  getSubcategoriesMapForConfig,
  getMaterialsForConfig,
} from './inventoryConstants';

export const DEFAULT_PRODUCT_CATEGORIES: string[] = getCategoriesForConfig();

export const DEFAULT_CATEGORY_MAP: Record<string, string[]> = getSubcategoriesMapForConfig();

export const DEFAULT_MATERIALS: string[] = getMaterialsForConfig();

export const DEFAULT_SIZE_SYSTEMS: Record<string, string[]> = {
  LETRAS: ['S', 'M', 'L', 'XL', 'XXL', 'U'],
  NUMEROS_ROPA: ['36', '38', '40', '42', '44', '46', '48', '50'],
  NUMEROS_CALZADO: ['35', '36', '37', '38', '39', '40', '41'],
  UNICO: ['U']
};

export const DEFAULT_CATEGORY_SIZE_MAP: Record<string, string> = {
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

export const PAYMENT_METHOD_COLORS: Record<string, { bg: string, text: string, dot: string }> = {
  'Efectivo - 10%': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Efectivo': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Crédito 1 Cuota': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  'Crédito 3 Cuotas': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  'Débito': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Transferencia': { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  'Vale': { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
};

export const STORAGE_KEYS = {
  SALES: 'boutique_sales_data',
  EXPENSES: 'boutique_expenses_data',
  INVENTORY: 'boutique_inventory_data',
  CONFIG: 'boutique_app_config',
};