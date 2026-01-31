import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// Usamos un cast a 'any' para que TypeScript ignore el error de Vite
const env = (import.meta as any).env;

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Inicialización con configuración de persistencia para evitar el loading infinito
export const supabase = isSupabaseConfigured 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true, 
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'atenea-auth-token'
      }
    })
  : null;

if (!supabase) {
  console.warn("⚠️ Supabase no está configurado. Revisa tu archivo .env");
}