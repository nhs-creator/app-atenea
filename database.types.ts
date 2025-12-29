export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          has_invoice_a: boolean
          id: string
          invoice_percentage: number
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          has_invoice_a?: boolean
          id?: string
          invoice_percentage?: number
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          has_invoice_a?: boolean
          id?: string
          invoice_percentage?: number
          user_id?: string
        }
      }
      inventory: {
        Row: {
          category: string
          cost_price: number
          created_at: string
          id: string
          last_updated: string
          material: string | null
          name: string
          selling_price: number
          sizes: Json
          stock_total: number
          subcategory: string | null
          user_id: string
        }
        Insert: {
          category: string
          cost_price?: number
          created_at?: string
          id?: string
          last_updated?: string
          material?: string | null
          name: string
          selling_price?: number
          sizes?: Json
          stock_total?: number // Opcional en el insert porque el trigger lo calcula
          subcategory?: string | null
          user_id?: string
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          last_updated?: string
          material?: string | null
          name?: string
          selling_price?: number
          sizes?: Json
          stock_total?: number
          subcategory?: string | null
          user_id?: string
        }
      }
      profiles: {
        Row: {
          id: string
          store_name: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          store_name?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          store_name?: string | null
          updated_at?: string | null
        }
      }
      sales: {
        Row: {
          client_number: string | null
          cost_price: number | null
          created_at: string
          date: string
          id: string
          inventory_id: string | null
          notes: string | null
          payment_method: string
          price: number
          product_name: string
          quantity: number
          size: string | null
          user_id: string
        }
        Insert: {
          client_number?: string | null
          cost_price?: number | null
          created_at?: string
          date: string
          id?: string
          inventory_id?: string | null
          notes?: string | null
          payment_method: string
          price: number
          product_name: string
          quantity?: number
          size?: string | null
          user_id?: string
        }
        Update: {
          client_number?: string | null
          cost_price?: number | null
          created_at?: string
          date?: string
          id?: string
          inventory_id?: string | null
          notes?: string | null
          payment_method?: string
          price?: number
          product_name?: string
          quantity?: number
          size?: string | null
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
