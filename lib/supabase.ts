import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// Usamos un cast a 'any' para que TypeScript ignore el error de Vite
const env = (import.meta as any).env;

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
}

// Inicialización con configuración de persistencia para evitar el loading infinito
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'atenea-auth-token'
  }
});
