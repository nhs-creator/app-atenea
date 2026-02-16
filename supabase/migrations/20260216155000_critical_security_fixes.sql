-- ============================================================================
-- CRITICAL SECURITY FIXES
-- Based on Schema Audit Report Sections 1 & 2
-- Date: 2026-02-16
-- ============================================================================
-- This migration fixes:
-- 1. RLS policies with cross-tenant data leaks
-- 2. Overly permissive GRANT to anon role
-- 3. Missing NOT NULL constraints
-- 4. Missing foreign key indexes
-- 5. Inconsistent FK ON DELETE behavior
-- ============================================================================

-- ============================================================================
-- STEP 1: REVOKE ANON ACCESS (CRITICAL)
-- ============================================================================

-- Revoke all access from anon role
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Revoke from handle_new_user (SECURITY DEFINER function)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- Revoke default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;

-- ============================================================================
-- STEP 2: CREATE ACCOUNTANT-OWNER RELATIONSHIP TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.accountant_assignments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accountant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (owner_id, accountant_id)
);

COMMENT ON TABLE public.accountant_assignments IS 'Links accountants to specific owners they can access';

ALTER TABLE public.accountant_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and accountants manage assignments"
  ON public.accountant_assignments
  TO authenticated
  USING (owner_id = auth.uid() OR accountant_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.accountant_assignments TO authenticated;
GRANT ALL ON public.accountant_assignments TO service_role;

-- ============================================================================
-- STEP 3: FIX EXPENSES RLS POLICIES (CRITICAL)
-- ============================================================================

-- Drop existing broken policies
DROP POLICY IF EXISTS "RLS_Expenses_Owner_Full_Access" ON public.expenses;
DROP POLICY IF EXISTS "RLS_Expenses_Accountant_Read_Only" ON public.expenses;

-- Create FIXED owner policy with user_id check
CREATE POLICY "RLS_Expenses_Owner_Full_Access" ON public.expenses
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  );

-- Create FIXED accountant policy with tenant scoping
CREATE POLICY "RLS_Expenses_Accountant_Read_Only" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'accountant'
    AND type <> 'personal'  -- Use type column which has CHECK constraint
    AND user_id IN (
      SELECT owner_id FROM public.accountant_assignments
      WHERE accountant_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: FIX SALES RLS POLICIES (CRITICAL)
-- ============================================================================

-- Drop existing broken policies
DROP POLICY IF EXISTS "RLS_Sales_Owner_Full_Access" ON public.sales;
DROP POLICY IF EXISTS "RLS_Sales_Accountant_Read_Only" ON public.sales;

-- Create FIXED owner policy with user_id check
CREATE POLICY "RLS_Sales_Owner_Full_Access" ON public.sales
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  );

-- Create FIXED accountant policy with tenant scoping
CREATE POLICY "RLS_Sales_Accountant_Read_Only" ON public.sales
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'accountant'
    AND user_id IN (
      SELECT owner_id FROM public.accountant_assignments
      WHERE accountant_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: FIX CLIENTS TABLE
-- ============================================================================

-- Make user_id NOT NULL (prevents orphan records)
-- First, check for NULL values and warn if found
DO $$
DECLARE
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM public.clients
  WHERE user_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Found % clients with NULL user_id. Fix them first with: UPDATE clients SET user_id = ''your-user-id'' WHERE user_id IS NULL;', v_null_count
      USING HINT = 'Run scripts/pre_migration_check.sql to identify data issues';
  END IF;
  
  RAISE NOTICE '✓ All clients have user_id, proceeding with NOT NULL constraint';
END $$;

ALTER TABLE public.clients ALTER COLUMN user_id SET NOT NULL;

-- ============================================================================
-- STEP 6: ADD MISSING FOREIGN KEY INDEXES (HIGH PRIORITY)
-- ============================================================================

-- These indexes dramatically improve query performance on foreign keys
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory (user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_subcategories_category_id 
  ON public.inventory_subcategories (category_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales (user_id);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales (client_id);
CREATE INDEX IF NOT EXISTS idx_sales_inventory_id ON public.sales (inventory_id);

-- ============================================================================
-- STEP 7: ADD COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_user_date 
  ON public.sales (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_user_status 
  ON public.sales (user_id, status);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date 
  ON public.expenses (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_type 
  ON public.expenses (user_id, type);

CREATE INDEX IF NOT EXISTS idx_inventory_user_category 
  ON public.inventory (user_id, category);

CREATE INDEX IF NOT EXISTS idx_sales_date 
  ON public.sales (date DESC);

-- ============================================================================
-- STEP 8: FIX INCONSISTENT ON DELETE BEHAVIOR
-- ============================================================================

-- Make all user_id foreign keys cascade on user deletion
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_user_id_fkey;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 9: ADD MISSING FK FOR VOUCHERS
-- ============================================================================

ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_user_id_fkey;
ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add client link to vouchers
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS client_id uuid
  REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_client_id ON public.vouchers (client_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON public.vouchers (user_id);

-- ============================================================================
-- STEP 10: ADD UPDATED_AT TRIGGERS
-- ============================================================================

-- Add updated_at to vouchers
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add updated_at trigger to clients
DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- STEP 11: ADD MISSING CREATED_AT COLUMNS
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.inventory_materials ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.inventory_subcategories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ============================================================================
-- STEP 12: ADD CHECK CONSTRAINT FOR PAYMENT_METHOD (OPTIONAL)
-- ============================================================================

-- Check for existing payment methods
DO $$
DECLARE
  v_methods text;
BEGIN
  SELECT string_agg(DISTINCT payment_method, ', ' ORDER BY payment_method)
  INTO v_methods
  FROM public.sales;
  
  RAISE NOTICE 'Existing payment methods in database: %', v_methods;
  RAISE NOTICE 'Skipping payment_method constraint to preserve existing data.';
  RAISE NOTICE 'To add constraint later, first standardize your payment_method values.';
END $$;

-- OPTIONAL: Uncomment this after standardizing your payment_method values
-- ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
-- ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check
--   CHECK (payment_method IN ('cash', 'card', 'credit', 'debit', 'transfer', 'mixed', 'voucher'));

-- ============================================================================
-- STEP 13: FIX NAMING INCONSISTENCIES
-- ============================================================================

-- Rename primary key constraint
ALTER INDEX IF EXISTS customers_pkey RENAME TO clients_pkey;

-- Rename foreign key (requires drop/recreate)
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Rename indexes
ALTER INDEX IF EXISTS idx_customers_user_id RENAME TO idx_clients_user_id;
ALTER INDEX IF EXISTS idx_customers_phone RENAME TO idx_clients_phone;

-- ============================================================================
-- STEP 14: FIX REDUNDANT VOUCHER CONSTRAINTS
-- ============================================================================

-- Keep only the global unique constraint on code
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS unique_voucher_code_per_user;

-- Drop redundant index (unique constraint already creates one)
DROP INDEX IF EXISTS idx_vouchers_code;

-- ============================================================================
-- STEP 15: SYNC CLIENT STATS FROM SALES
-- ============================================================================

-- Create trigger to keep client stats in sync
CREATE OR REPLACE FUNCTION public.sync_client_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Update stats for affected client on INSERT/UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.client_id IS NOT NULL THEN
    UPDATE public.clients SET
      total_spent = (
        SELECT COALESCE(SUM(price * quantity), 0) FROM public.sales
        WHERE client_id = NEW.client_id AND status = 'completed'
      ),
      last_purchase_date = (
        SELECT MAX(date) FROM public.sales
        WHERE client_id = NEW.client_id AND status = 'completed'
      ),
      updated_at = now()
    WHERE id = NEW.client_id;
  END IF;

  -- Update stats for old client on DELETE or client change
  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.client_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR OLD.client_id <> NEW.client_id)
  THEN
    UPDATE public.clients SET
      total_spent = (
        SELECT COALESCE(SUM(price * quantity), 0) FROM public.sales
        WHERE client_id = OLD.client_id AND status = 'completed'
      ),
      last_purchase_date = (
        SELECT MAX(date) FROM public.sales
        WHERE client_id = OLD.client_id AND status = 'completed'
      ),
      updated_at = now()
    WHERE id = OLD.client_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_sync_client_stats ON public.sales;
CREATE TRIGGER trg_sales_sync_client_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_stats();

-- Backfill existing client stats
UPDATE public.clients c SET
  total_spent = (
    SELECT COALESCE(SUM(s.price * s.quantity), 0)
    FROM public.sales s
    WHERE s.client_id = c.id AND s.status = 'completed'
  ),
  last_purchase_date = (
    SELECT MAX(s.date)
    FROM public.sales s
    WHERE s.client_id = c.id AND s.status = 'completed'
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Critical security fixes migration completed successfully!';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Security fixes applied:';
  RAISE NOTICE '  ✓ Revoked anon access to all tables and functions';
  RAISE NOTICE '  ✓ Fixed RLS policies to prevent cross-tenant data leaks';
  RAISE NOTICE '  ✓ Added accountant-owner relationship table';
  RAISE NOTICE '  ✓ Made clients.user_id NOT NULL';
  RAISE NOTICE '  ✓ Added 10+ missing indexes for performance';
  RAISE NOTICE '  ✓ Fixed inconsistent ON DELETE behavior';
  RAISE NOTICE '  ✓ Added client stats sync trigger';
  RAISE NOTICE '  ✓ Fixed naming inconsistencies';
  RAISE NOTICE '==================================================================';
END $$;
