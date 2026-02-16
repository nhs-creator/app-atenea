# Schema Audit Report — Atenea Finanzas

> **Source**: `supabase/migrations/20260216151839_remote_schema.sql`
> **Date**: 2026-02-16
> **Auditor**: Automated deep audit
> **Tables**: clients, expenses, inventory, inventory_categories, inventory_materials, inventory_subcategories, profiles, sales, vouchers
> **Functions**: calculate_stock_total, handle_new_user, handle_updated_at

---

## Executive Summary

The schema supports a clothing-store management app with sales, expenses, inventory (size-level stock in JSONB), vouchers, and role-based access (owner / accountant). While the foundation is reasonable, there are **critical multi-tenant security holes** in RLS policies, **overly permissive GRANTs**, several missing foreign keys and indexes, and the inventory system lacks a movement/audit trail, stock integrity enforcement, and SKU support.

**Issue count by severity:**

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 8 |
| Medium | 12 |
| Low | 7 |

---

## 1. Security (Critical / High)

### 1.1 [CRITICAL] RLS: Owner policies lack `user_id` filter — full cross-tenant data leak

The `RLS_Expenses_Owner_Full_Access` and `RLS_Sales_Owner_Full_Access` policies check **only** that the current user's role is `'owner'`. They do **not** verify `user_id = auth.uid()`. This means **any owner can read, update, and delete every other owner's expenses and sales**.

**Current (broken):**

```sql
-- expenses: owner A sees owner B's expenses
CREATE POLICY "RLS_Expenses_Owner_Full_Access" ON expenses TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

-- sales: same problem
CREATE POLICY "RLS_Sales_Owner_Full_Access" ON sales TO authenticated
  USING  ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');
```

**Fix — add `user_id` check:**

```sql
-- Fix expenses policy
DROP POLICY IF EXISTS "RLS_Expenses_Owner_Full_Access" ON public.expenses;
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

-- Fix sales policy
DROP POLICY IF EXISTS "RLS_Sales_Owner_Full_Access" ON public.sales;
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
```

---

### 1.2 [CRITICAL] RLS: Accountant policies leak all tenants' data

The accountant policies check the user's role but do **not** scope to a specific owner's data. An accountant can see **every owner's** sales and expenses.

**Current (broken):**

```sql
CREATE POLICY "RLS_Expenses_Accountant_Read_Only" ON expenses FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'accountant'
    AND category <> 'Personal'
  );

CREATE POLICY "RLS_Sales_Accountant_Read_Only" ON sales FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'accountant'
  );
```

**Fix — requires an owner-accountant relationship table:**

```sql
-- Step 1: create the relationship table
CREATE TABLE IF NOT EXISTS public.accountant_assignments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accountant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (owner_id, accountant_id)
);
ALTER TABLE public.accountant_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their accountants"
  ON public.accountant_assignments
  TO authenticated
  USING (owner_id = auth.uid() OR accountant_id = auth.uid());

-- Step 2: fix expenses accountant policy
DROP POLICY IF EXISTS "RLS_Expenses_Accountant_Read_Only" ON public.expenses;
CREATE POLICY "RLS_Expenses_Accountant_Read_Only" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'accountant'
    AND category <> 'Personal'
    AND user_id IN (
      SELECT owner_id FROM public.accountant_assignments
      WHERE accountant_id = auth.uid()
    )
  );

-- Step 3: fix sales accountant policy
DROP POLICY IF EXISTS "RLS_Sales_Accountant_Read_Only" ON public.sales;
CREATE POLICY "RLS_Sales_Accountant_Read_Only" ON public.sales
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'accountant'
    AND user_id IN (
      SELECT owner_id FROM public.accountant_assignments
      WHERE accountant_id = auth.uid()
    )
  );
```

---

### 1.3 [CRITICAL] GRANT ALL on every table to `anon`

Every table grants `ALL` (SELECT, INSERT, UPDATE, DELETE) to the `anon` role. While RLS mitigates this, it means any unauthenticated API call can attempt writes, and any RLS misconfiguration immediately becomes exploitable. The `anon` role should have **zero** access to these tables unless specifically needed (e.g., a public storefront).

```sql
-- Revoke everything from anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Revoke default privileges too
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
```

---

### 1.4 [CRITICAL] `handle_new_user()` is SECURITY DEFINER and callable by `anon`

The function runs with **postgres owner privileges** and is granted to `anon`. If someone can invoke it directly (e.g., via `rpc`), they could insert into `profiles` bypassing RLS.

```sql
-- Revoke from anon (and authenticated for direct calls — the trigger handles it)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
-- Only service_role and postgres should invoke it
```

---

### 1.5 [HIGH] RLS policies use subqueries on every row — no JWT claim optimization

Every policy that checks `profiles.role` fires a `SELECT` against `profiles` per row evaluated. This is both a performance and security concern (subquery can be cached by planner, but not guaranteed).

**Recommended**: Store role in the JWT custom claims via a `handle_new_user` update, then read from `auth.jwt()`:

```sql
-- Example policy using JWT claims (after configuring custom claims in Supabase)
CREATE POLICY "RLS_Expenses_Owner_Full_Access" ON public.expenses
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (auth.jwt() ->> 'user_role') = 'owner'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (auth.jwt() ->> 'user_role') = 'owner'
  );
```

This eliminates the subquery entirely and makes policies ~10x faster on large datasets.

---

### 1.6 [HIGH] Lookup tables have no INSERT/UPDATE/DELETE policies

`inventory_categories`, `inventory_materials`, and `inventory_subcategories` have only a `SELECT` policy. Since RLS is enabled and there are no write policies, writes are implicitly denied for `authenticated`. However, the `service_role` bypasses RLS. To be explicit and safe:

```sql
-- Add explicit write policies for admin management (optional, controlled via service_role)
-- For now, ensure no write policies exist for authenticated — this is currently correct.
-- Just remove the anon GRANT (covered in 1.3).
```

---

### 1.7 [HIGH] `expenses.category` filter for accountant is case-sensitive and fragile

The accountant exclusion `category <> 'Personal'` uses a literal string comparison. If the frontend sends `'personal'` or `'PERSONAL'`, the filter fails silently.

```sql
-- Better: use a CHECK constraint to enforce allowed values, or use lower()
-- In the policy:
AND lower(category) <> 'personal'
```

Or better yet, use the `type` column which already has a CHECK constraint (`'business'` / `'personal'`):

```sql
AND type <> 'personal'
```

---

## 2. Architecture & Design

### 2.1 [HIGH] `clients.user_id` is nullable — orphan clients possible

A client can be created without a `user_id`, making it invisible to RLS and orphaned. The RLS policy `auth.uid() = user_id` will never match `NULL`.

```sql
ALTER TABLE public.clients ALTER COLUMN user_id SET NOT NULL;
```

---

### 2.2 [HIGH] `inventory.category`, `subcategory`, `material` are free text — no FK to lookup tables

Despite having `inventory_categories`, `inventory_subcategories`, and `inventory_materials` tables, the `inventory` table uses plain `text` columns instead of foreign keys. This means lookup tables serve no enforcement purpose.

```sql
-- After ensuring existing data aligns with lookup tables:
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_category_fkey
    FOREIGN KEY (category) REFERENCES public.inventory_categories(id);

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_subcategory_fkey
    FOREIGN KEY (subcategory) REFERENCES public.inventory_subcategories(id);

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_material_fkey
    FOREIGN KEY (material) REFERENCES public.inventory_materials(id);
```

---

### 2.3 [HIGH] JSONB `sizes` column lacks validation — any data can be stored

The `sizes` JSONB column stores stock per size (e.g., `{"S": 5, "M": 10}`), but there is no CHECK constraint. Invalid data like `{"S": "abc"}` or `{"S": -5}` would silently break `calculate_stock_total()` or allow negative stock.

```sql
-- Add a CHECK constraint to validate sizes format
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_sizes_valid CHECK (
    jsonb_typeof(sizes) = 'object'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_each_text(sizes) AS kv
      WHERE kv.value !~ '^\d+$'  -- only non-negative integers
    )
  );
```

---

### 2.4 [MEDIUM] `sales.client_number` vs `sales.client_id` — redundant and confusing

The `sales` table has both `client_number` (text, NOT NULL, indexed) and `client_id` (uuid, FK to clients, nullable). This creates ambiguity about which is the canonical client reference. `client_number` appears to be a legacy field.

**Recommendation**: Migrate to using only `client_id`. If `client_number` is still needed for display, make it nullable or derive it from the `clients` table.

```sql
-- Step 1: backfill client_id from client_number where possible
-- Step 2: make client_number nullable (or remove)
ALTER TABLE public.sales ALTER COLUMN client_number DROP NOT NULL;
-- Step 3: eventually drop column after migration
```

---

### 2.5 [MEDIUM] `clients.total_spent` and `last_purchase_date` are denormalized without sync

These columns have no trigger or mechanism to stay in sync with `sales`. They'll drift as soon as sales are edited or deleted.

```sql
-- Option A: Trigger on sales to update clients
CREATE OR REPLACE FUNCTION public.sync_client_stats() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
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

  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.client_id IS NOT NULL THEN
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

CREATE TRIGGER trg_sales_sync_client_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_stats();
```

---

### 2.6 [MEDIUM] Inconsistent FK `ON DELETE` behavior

| FK | ON DELETE | Concern |
|----|-----------|---------|
| `clients.user_id → auth.users` | CASCADE | OK |
| `expenses.user_id → auth.users` | *(none = RESTRICT)* | Prevents user deletion |
| `inventory.user_id → auth.users` | *(none = RESTRICT)* | Prevents user deletion |
| `sales.user_id → auth.users` | *(none = RESTRICT)* | Prevents user deletion |
| `sales.client_id → clients` | SET NULL | OK |
| `sales.inventory_id → inventory` | SET NULL | OK |
| `profiles.id → auth.users` | CASCADE | OK |
| `vouchers.user_id` | *(no FK declared!)* | See 2.7 |

**Fix — make delete behavior consistent:**

```sql
-- expenses: cascade or set null on user delete
ALTER TABLE public.expenses DROP CONSTRAINT expenses_user_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- inventory: same
ALTER TABLE public.inventory DROP CONSTRAINT inventory_user_id_fkey;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- sales: same
ALTER TABLE public.sales DROP CONSTRAINT sales_user_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

---

### 2.7 [MEDIUM] `vouchers.user_id` has no FK and no `client_id`

The `vouchers` table has `user_id` with a DEFAULT but no foreign key constraint. Also, vouchers are not linked to any client.

```sql
-- Add FK to auth.users
ALTER TABLE public.vouchers
  ADD CONSTRAINT vouchers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add client link
ALTER TABLE public.vouchers ADD COLUMN client_id uuid
  REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX idx_vouchers_client_id ON public.vouchers (client_id);
```

---

### 2.8 [MEDIUM] No `updated_at` trigger on `inventory` or `clients`

`inventory` has `last_updated` (non-standard name) and `clients` has `updated_at`, but neither has a trigger to auto-update these timestamps.

```sql
-- Rename inventory.last_updated → updated_at for consistency
ALTER TABLE public.inventory RENAME COLUMN last_updated TO updated_at;

-- Add triggers
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

### 2.9 [MEDIUM] `vouchers` has no `updated_at` column

Can't track when a voucher was last modified (e.g., partially redeemed).

```sql
ALTER TABLE public.vouchers ADD COLUMN updated_at timestamptz DEFAULT now();

CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

### 2.10 [LOW] `sales.payment_method` has no CHECK constraint

Unlike `sales.status` and `expenses.type`, `payment_method` is unconstrained free text.

```sql
ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'transfer', 'mixed', 'voucher'));
```

---

### 2.11 [LOW] `profiles` missing `created_at`

Every other table has `created_at` but `profiles` does not.

```sql
ALTER TABLE public.profiles ADD COLUMN created_at timestamptz DEFAULT now();
```

---

### 2.12 [LOW] Lookup tables (`inventory_categories`, `inventory_materials`) lack `created_at`

Minor, but useful for auditing when categories were added.

```sql
ALTER TABLE public.inventory_categories ADD COLUMN created_at timestamptz DEFAULT now();
ALTER TABLE public.inventory_materials ADD COLUMN created_at timestamptz DEFAULT now();
ALTER TABLE public.inventory_subcategories ADD COLUMN created_at timestamptz DEFAULT now();
```

---

## 3. Performance

### 3.1 [HIGH] Missing indexes on foreign key columns

Foreign key columns without indexes cause slow joins, lookups, and cascading deletes.

```sql
CREATE INDEX IF NOT EXISTS idx_expenses_user_id
  ON public.expenses (user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_user_id
  ON public.inventory (user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_subcategories_category_id
  ON public.inventory_subcategories (category_id);

CREATE INDEX IF NOT EXISTS idx_sales_user_id
  ON public.sales (user_id);

CREATE INDEX IF NOT EXISTS idx_sales_client_id
  ON public.sales (client_id);

CREATE INDEX IF NOT EXISTS idx_sales_inventory_id
  ON public.sales (inventory_id);

CREATE INDEX IF NOT EXISTS idx_vouchers_user_id
  ON public.vouchers (user_id);
```

---

### 3.2 [HIGH] Missing composite indexes for common query patterns

The app likely queries by user + date range frequently (dashboard, reports).

```sql
CREATE INDEX IF NOT EXISTS idx_sales_user_date
  ON public.sales (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON public.expenses (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_user_category
  ON public.inventory (user_id, category);

CREATE INDEX IF NOT EXISTS idx_sales_user_status
  ON public.sales (user_id, status);
```

---

### 3.3 [MEDIUM] `sales.date` has no index

Date filtering is likely the most common query pattern.

```sql
CREATE INDEX IF NOT EXISTS idx_sales_date
  ON public.sales (date DESC);
```

---

### 3.4 [MEDIUM] Redundant unique constraints on `vouchers.code`

The table has both `vouchers_code_key UNIQUE(code)` and `unique_voucher_code_per_user UNIQUE(user_id, code)`. The global unique on `code` alone makes the composite constraint redundant. Decide which is correct:

- If codes are globally unique → keep only `vouchers_code_key`, drop `unique_voucher_code_per_user`.
- If codes are unique per user → drop `vouchers_code_key`, keep `unique_voucher_code_per_user`.

```sql
-- If codes are globally unique (likely, since they're generated):
ALTER TABLE public.vouchers DROP CONSTRAINT unique_voucher_code_per_user;
```

---

### 3.5 [LOW] `idx_vouchers_code` is redundant with `vouchers_code_key`

A unique constraint automatically creates a unique index. The explicit `idx_vouchers_code` btree index is a duplicate.

```sql
DROP INDEX IF EXISTS idx_vouchers_code;
```

---

## 4. Naming & Structure

### 4.1 [MEDIUM] Constraint naming mismatches

| Object | Current Name | Expected Name |
|--------|-------------|---------------|
| clients PK | `customers_pkey` | `clients_pkey` |
| sales → clients FK | `sales_customer_id_fkey` | `sales_client_id_fkey` |
| clients user_id index | `idx_customers_user_id` | `idx_clients_user_id` |
| clients phone index | `idx_customers_phone` | `idx_clients_phone` |

```sql
-- Rename PK
ALTER INDEX customers_pkey RENAME TO clients_pkey;

-- Rename FK (requires drop + recreate)
ALTER TABLE public.sales DROP CONSTRAINT sales_customer_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Rename indexes
ALTER INDEX idx_customers_user_id RENAME TO idx_clients_user_id;
ALTER INDEX idx_customers_phone RENAME TO idx_clients_phone;
```

---

### 4.2 [MEDIUM] `inventory.last_updated` doesn't follow convention

All other tables use `updated_at`. This table uses `last_updated`.

```sql
ALTER TABLE public.inventory RENAME COLUMN last_updated TO updated_at;
-- Update any application code referencing last_updated
```

---

### 4.3 [LOW] Mixed PK type strategy

- `inventory_categories`, `inventory_materials`, `inventory_subcategories` use `text` PKs.
- All other tables use `uuid` PKs.

This is acceptable for small lookup tables but worth noting. If these tables grow or need to support renaming, consider switching to `uuid` PKs with a separate `slug` column.

---

### 4.4 [LOW] Trigger naming convention inconsistency

Triggers mix styles: `trg_expenses_updated_at` (prefixed) vs `on_auth_user_created` (unprefixed, different pattern). Adopt a consistent pattern like `trg_{table}_{action}`.

---

## 5. Inventory System — Deep Dive

### Current State Assessment

| Feature | Status |
|---------|--------|
| Size-level stock tracking (JSONB) | Exists but unvalidated |
| `stock_total` auto-sync | Exists (trigger) |
| SKU / barcode | **Missing** |
| Movement history / audit trail | **Missing** |
| Stock deduction on sale | **Missing** |
| Stock restoration on return/cancel | **Missing** |
| Negative stock prevention | **Missing** |
| Low-stock alerts | **Missing** |
| Cost price history | **Missing** |
| Reconciliation support | **Missing** |

---

### 5.1 [HIGH] Add `sku` and `barcode` columns

```sql
ALTER TABLE public.inventory ADD COLUMN sku text;
ALTER TABLE public.inventory ADD COLUMN barcode text;

-- SKU unique per user (different stores can have same SKU)
CREATE UNIQUE INDEX idx_inventory_sku_per_user
  ON public.inventory (user_id, sku) WHERE sku IS NOT NULL;

-- Barcode unique per user
CREATE UNIQUE INDEX idx_inventory_barcode_per_user
  ON public.inventory (user_id, barcode) WHERE barcode IS NOT NULL;
```

---

### 5.2 [HIGH] Create `inventory_movements` table for full audit trail

This is the **most important** addition for inventory robustness. Every stock change must be recorded.

```sql
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  movement_type text NOT NULL,
  size text NOT NULL,
  quantity_change integer NOT NULL,  -- positive = stock in, negative = stock out
  quantity_before integer NOT NULL,  -- snapshot for audit
  quantity_after integer NOT NULL,   -- snapshot for audit
  reference_type text,               -- 'sale', 'purchase_order', 'manual', etc.
  reference_id uuid,                 -- FK to sales.id, purchase_orders.id, etc.
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT movement_type_check CHECK (
    movement_type IN ('sale', 'return', 'restock', 'adjustment', 'transfer_in', 'transfer_out', 'initial')
  ),
  CONSTRAINT quantity_after_non_negative CHECK (quantity_after >= 0),
  CONSTRAINT movement_math_check CHECK (quantity_before + quantity_change = quantity_after)
);

-- Indexes for common queries
CREATE INDEX idx_inv_movements_inventory_id ON public.inventory_movements (inventory_id);
CREATE INDEX idx_inv_movements_created_at ON public.inventory_movements (created_at DESC);
CREATE INDEX idx_inv_movements_user_id ON public.inventory_movements (user_id);
CREATE INDEX idx_inv_movements_reference ON public.inventory_movements (reference_type, reference_id);
CREATE INDEX idx_inv_movements_type ON public.inventory_movements (movement_type);

-- RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RLS_Inventory_Movements" ON public.inventory_movements
  USING (user_id = auth.uid());

-- GRANTs (no anon!)
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
```

---

### 5.3 [HIGH] Stock deduction trigger on sale creation

When a sale is created or returned, the inventory must update automatically.

```sql
CREATE OR REPLACE FUNCTION public.handle_sale_stock_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_current_qty integer;
  v_new_qty integer;
  v_inv_sizes jsonb;
BEGIN
  -- Only process if inventory_id and size are provided
  IF NEW.inventory_id IS NULL OR NEW.size IS NULL THEN
    RETURN NEW;
  END IF;

  -- On INSERT with status 'completed': deduct stock
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    SELECT sizes INTO v_inv_sizes FROM public.inventory WHERE id = NEW.inventory_id FOR UPDATE;

    v_current_qty := COALESCE((v_inv_sizes ->> NEW.size)::int, 0);
    v_new_qty := v_current_qty - NEW.quantity;

    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for size %. Available: %, Requested: %',
        NEW.size, v_current_qty, NEW.quantity;
    END IF;

    UPDATE public.inventory
      SET sizes = jsonb_set(sizes, ARRAY[NEW.size], to_jsonb(v_new_qty))
      WHERE id = NEW.inventory_id;

    -- Record movement
    INSERT INTO public.inventory_movements
      (inventory_id, user_id, movement_type, size, quantity_change,
       quantity_before, quantity_after, reference_type, reference_id)
    VALUES
      (NEW.inventory_id, NEW.user_id, 'sale', NEW.size, -NEW.quantity,
       v_current_qty, v_new_qty, 'sale', NEW.id);
  END IF;

  -- On UPDATE to 'returned' or 'cancelled': restore stock
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'completed'
     AND NEW.status IN ('returned', 'cancelled')
  THEN
    SELECT sizes INTO v_inv_sizes FROM public.inventory WHERE id = NEW.inventory_id FOR UPDATE;

    v_current_qty := COALESCE((v_inv_sizes ->> NEW.size)::int, 0);
    v_new_qty := v_current_qty + OLD.quantity;

    UPDATE public.inventory
      SET sizes = jsonb_set(sizes, ARRAY[NEW.size], to_jsonb(v_new_qty))
      WHERE id = NEW.inventory_id;

    INSERT INTO public.inventory_movements
      (inventory_id, user_id, movement_type, size, quantity_change,
       quantity_before, quantity_after, reference_type, reference_id)
    VALUES
      (NEW.inventory_id, NEW.user_id, 'return', NEW.size, OLD.quantity,
       v_current_qty, v_new_qty, 'sale', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_stock_change
  AFTER INSERT OR UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_stock_change();
```

---

### 5.4 [MEDIUM] Negative stock prevention at the database level

Beyond the trigger, add a general-purpose check to prevent negative stock values in the JSONB:

```sql
-- This is already handled by the CHECK in 2.3 (sizes values must be non-negative integers)
-- Plus the trigger in 5.3 raises an exception on insufficient stock.
-- For defense in depth, also add:

ALTER TABLE public.inventory ADD CONSTRAINT inventory_stock_total_non_negative
  CHECK (stock_total >= 0);
```

---

### 5.5 [MEDIUM] Reconciliation function

Verify that `sizes` JSONB matches the sum of all movements:

```sql
CREATE OR REPLACE FUNCTION public.reconcile_inventory(p_inventory_id uuid)
RETURNS TABLE (
  size text,
  expected_qty integer,
  actual_qty integer,
  difference integer
) LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH movement_totals AS (
    SELECT
      m.size,
      SUM(m.quantity_change)::integer AS expected_qty
    FROM public.inventory_movements m
    WHERE m.inventory_id = p_inventory_id
    GROUP BY m.size
  ),
  current_stock AS (
    SELECT
      kv.key AS size,
      kv.value::integer AS actual_qty
    FROM public.inventory i,
         jsonb_each_text(i.sizes) kv
    WHERE i.id = p_inventory_id
  )
  SELECT
    COALESCE(mt.size, cs.size) AS size,
    COALESCE(mt.expected_qty, 0) AS expected_qty,
    COALESCE(cs.actual_qty, 0) AS actual_qty,
    COALESCE(cs.actual_qty, 0) - COALESCE(mt.expected_qty, 0) AS difference
  FROM movement_totals mt
  FULL OUTER JOIN current_stock cs ON mt.size = cs.size
  WHERE COALESCE(cs.actual_qty, 0) <> COALESCE(mt.expected_qty, 0);
$$;
```

---

### 5.6 [MEDIUM] Cost price history tracking

When `cost_price` changes on inventory, record it for margin analysis:

```sql
CREATE TABLE IF NOT EXISTS public.inventory_price_history (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  cost_price numeric(12,2) NOT NULL,
  selling_price numeric(12,2) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_price_history_inventory ON public.inventory_price_history (inventory_id, changed_at DESC);
ALTER TABLE public.inventory_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RLS_Price_History" ON public.inventory_price_history
  USING (
    inventory_id IN (SELECT id FROM public.inventory WHERE user_id = auth.uid())
  );

-- Trigger to capture price changes
CREATE OR REPLACE FUNCTION public.track_price_change() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.cost_price IS DISTINCT FROM NEW.cost_price
     OR OLD.selling_price IS DISTINCT FROM NEW.selling_price
  THEN
    INSERT INTO public.inventory_price_history
      (inventory_id, cost_price, selling_price, changed_by)
    VALUES
      (NEW.id, NEW.cost_price, NEW.selling_price, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_price_history
  AFTER UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.track_price_change();
```

---

### 5.7 [LOW] Low-stock alert view

```sql
CREATE OR REPLACE VIEW public.low_stock_items AS
SELECT
  i.id,
  i.user_id,
  i.name,
  i.sku,
  i.stock_total,
  i.category,
  kv.key AS size,
  kv.value::int AS quantity
FROM public.inventory i,
     jsonb_each_text(i.sizes) kv
WHERE kv.value::int <= 2  -- threshold, adjust as needed
  AND kv.value::int >= 0;

-- Note: Apply RLS through the inventory table's policies; views inherit
-- Or use a function with SECURITY INVOKER (PG15+)
```

---

## 6. Prioritized Action Plan

### Phase 1 — Critical Security (Do Immediately)

| # | Issue | Section | Effort |
|---|-------|---------|--------|
| 1 | Fix owner RLS policies — add `user_id` filter | 1.1 | 15 min |
| 2 | Fix accountant RLS — add tenant scoping | 1.2 | 1 hr |
| 3 | Revoke `anon` grants on all tables/functions | 1.3 | 10 min |
| 4 | Revoke `anon`/`authenticated` from `handle_new_user` | 1.4 | 5 min |

### Phase 2 — High Priority Fixes

| # | Issue | Section | Effort |
|---|-------|---------|--------|
| 5 | Add missing FK indexes | 3.1 | 10 min |
| 6 | Add composite indexes | 3.2 | 10 min |
| 7 | Make `clients.user_id` NOT NULL | 2.1 | 5 min |
| 8 | Add FK from inventory → lookup tables | 2.2 | 30 min |
| 9 | Add JSONB `sizes` validation CHECK | 2.3 | 15 min |
| 10 | Create `inventory_movements` table | 5.2 | 30 min |
| 11 | Add stock deduction trigger on sales | 5.3 | 1 hr |
| 12 | Add `sku`/`barcode` columns | 5.1 | 15 min |

### Phase 3 — Medium Priority

| # | Issue | Section | Effort |
|---|-------|---------|--------|
| 13 | Sync `clients.total_spent` / `last_purchase_date` | 2.5 | 30 min |
| 14 | Fix inconsistent FK `ON DELETE` behavior | 2.6 | 15 min |
| 15 | Add FK for `vouchers.user_id` + `client_id` | 2.7 | 10 min |
| 16 | Add `updated_at` triggers for inventory + clients | 2.8 | 10 min |
| 17 | Add `updated_at` to vouchers | 2.9 | 5 min |
| 18 | Fix naming inconsistencies | 4.1, 4.2 | 15 min |
| 19 | Negative stock constraint | 5.4 | 5 min |
| 20 | Reconciliation function | 5.5 | 30 min |
| 21 | Price history tracking | 5.6 | 30 min |
| 22 | Fix redundant voucher constraints | 3.4 | 5 min |

### Phase 4 — Low Priority / Nice to Have

| # | Issue | Section | Effort |
|---|-------|---------|--------|
| 23 | Add `payment_method` CHECK constraint | 2.10 | 5 min |
| 24 | Add `created_at` to profiles | 2.11 | 5 min |
| 25 | Add `created_at` to lookup tables | 2.12 | 5 min |
| 26 | Drop redundant `idx_vouchers_code` | 3.5 | 2 min |
| 27 | Low-stock alert view | 5.7 | 15 min |
| 28 | JWT claims for RLS optimization | 1.5 | 1 hr |
| 29 | Normalize trigger naming | 4.4 | 10 min |

---

## 7. Schema Diagram (Logical)

```
auth.users
  ├── profiles (1:1, CASCADE)
  ├── clients (1:N, CASCADE)
  │     └── sales.client_id (N:1, SET NULL)
  ├── expenses (1:N, CASCADE*)
  ├── inventory (1:N, CASCADE*)
  │     ├── sales.inventory_id (N:1, SET NULL)
  │     ├── inventory_movements (1:N, RESTRICT)
  │     └── inventory_price_history (1:N, CASCADE)
  ├── sales (1:N, CASCADE*)
  ├── vouchers (1:N, CASCADE*)
  └── accountant_assignments (N:N, CASCADE)

inventory_categories
  └── inventory_subcategories (1:N, CASCADE)

inventory_materials (standalone lookup)

* = currently missing CASCADE, recommended in section 2.6
```

---

## 8. Complete Migration Script (All Fixes)

For convenience, a single migration file combining all critical and high-priority fixes is available. Generate it by extracting the SQL snippets from sections 1.1–1.4, 2.1–2.3, 3.1–3.2, and 5.1–5.3 above in order.

> **Important**: Test this migration against a staging environment before applying to production. Back up your database first.
