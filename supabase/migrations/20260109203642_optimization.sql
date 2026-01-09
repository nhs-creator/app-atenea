-- 1. SEGURIDAD: Fijar el search_path en las funciones (Evita ataques de mutación de esquema)
ALTER FUNCTION public.calculate_stock_total() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. RENDIMIENTO: Optimizar RLS (Usa subconsultas para auth.uid() para evitar re-evaluación por fila)

-- Tabla: expenses
DROP POLICY IF EXISTS "RLS_Expenses" ON public.expenses;
CREATE POLICY "RLS_Expenses" ON public.expenses
FOR ALL TO public USING ((SELECT auth.uid()) = user_id);

-- Tabla: inventory
DROP POLICY IF EXISTS "RLS_Inventory" ON public.inventory;
CREATE POLICY "RLS_Inventory" ON public.inventory
FOR ALL TO public USING ((SELECT auth.uid()) = user_id);

-- Tabla: profiles
DROP POLICY IF EXISTS "RLS_Profiles" ON public.profiles;
CREATE POLICY "RLS_Profiles" ON public.profiles
FOR ALL TO public USING ((SELECT auth.uid()) = id);

-- Tabla: sales
DROP POLICY IF EXISTS "RLS_Sales" ON public.sales;
CREATE POLICY "RLS_Sales" ON public.sales
FOR ALL TO public USING ((SELECT auth.uid()) = user_id);

-- 3. OPTIMIZACIÓN POS: Índice para ID Semántico y Not Null
CREATE INDEX IF NOT EXISTS idx_sales_client_number ON public.sales(client_number);
ALTER TABLE public.sales ALTER COLUMN client_number SET NOT NULL;