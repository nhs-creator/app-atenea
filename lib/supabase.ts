import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// En Vite, se usa import.meta.env en lugar de process.env
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Verificación de configuración
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));


// Inicialización controlada
let supabaseInstance: SupabaseClient<Database> | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error("Error al inicializar el cliente de Supabase:", err);
  }
} else {
  console.warn("⚠️ Supabase no está configurado. Revisa tu archivo .env");
}

export const supabase = supabaseInstance;