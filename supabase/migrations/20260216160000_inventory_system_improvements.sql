-- ============================================================================
-- INVENTORY SYSTEM IMPROVEMENTS MIGRATION
-- Based on Schema Audit Report Section 5
-- Date: 2026-02-16
-- ============================================================================
-- This migration implements:
-- 1. SKU/barcode support
-- 2. JSONB sizes validation
-- 3. Inventory movements audit trail
-- 4. Automatic stock deduction on sale
-- 5. Negative stock prevention
-- 6. Price history tracking
-- 7. Reconciliation function
-- 8. Low-stock alert view
-- ============================================================================

-- ============================================================================
-- STEP 1: INVENTORY TABLE IMPROVEMENTS
-- ============================================================================

-- 1.1: Rename last_updated to updated_at for consistency
ALTER TABLE public.inventory RENAME COLUMN last_updated TO updated_at;

-- 1.2: Add SKU and barcode columns
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS barcode text;

-- 1.3: Add unique constraints for SKU (unique per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_sku_per_user
  ON public.inventory (user_id, sku) WHERE sku IS NOT NULL;

-- 1.4: Add unique constraints for barcode (unique per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_barcode_per_user
  ON public.inventory (user_id, barcode) WHERE barcode IS NOT NULL;

-- 1.5: Add indexes for SKU/barcode lookups
CREATE INDEX IF NOT EXISTS idx_inventory_sku
  ON public.inventory (sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_barcode
  ON public.inventory (barcode) WHERE barcode IS NOT NULL;

-- 1.6: Add JSONB sizes validation CHECK constraint
-- Note: Subqueries aren't allowed in CHECK constraints in PostgreSQL
-- We'll validate the basic structure here, and detailed validation happens in triggers
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_sizes_valid;
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_sizes_valid CHECK (
    jsonb_typeof(sizes) = 'object'
  );

-- 1.7: Add constraint to prevent negative stock_total
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_stock_total_non_negative;
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_stock_total_non_negative CHECK (stock_total >= 0);

-- 1.8: Add validation trigger for sizes JSONB
-- This validates that all size values are non-negative integers
CREATE OR REPLACE FUNCTION public.validate_inventory_sizes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_key text;
  v_value text;
BEGIN
  -- Check that sizes is an object
  IF jsonb_typeof(NEW.sizes) != 'object' THEN
    RAISE EXCEPTION 'sizes must be a JSON object';
  END IF;
  
  -- Check each size value is a non-negative integer
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(NEW.sizes)
  LOOP
    -- Check if value is numeric
    IF v_value !~ '^\d+$' THEN
      RAISE EXCEPTION 'Size "%" has invalid value "%". All size values must be non-negative integers.', v_key, v_value;
    END IF;
    
    -- Check if value when cast to int is not too large
    IF v_value::numeric > 2147483647 THEN
      RAISE EXCEPTION 'Size "%" value % is too large. Maximum is 2147483647.', v_key, v_value;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_validate_sizes ON public.inventory;
CREATE TRIGGER trg_inventory_validate_sizes
  BEFORE INSERT OR UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_sizes();

-- 1.9: Add updated_at trigger for inventory
DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- STEP 2: INVENTORY MOVEMENTS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
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
    movement_type IN ('sale', 'return', 'restock', 'adjustment', 'transfer_in', 'transfer_out', 'initial', 'cancel')
  ),
  CONSTRAINT quantity_after_non_negative CHECK (quantity_after >= 0),
  CONSTRAINT movement_math_check CHECK (quantity_before + quantity_change = quantity_after)
);

-- Add comment to table
COMMENT ON TABLE public.inventory_movements IS 'Complete audit trail for all inventory stock changes';
COMMENT ON COLUMN public.inventory_movements.quantity_change IS 'Positive for stock increases, negative for decreases';
COMMENT ON COLUMN public.inventory_movements.quantity_before IS 'Stock level before this movement';
COMMENT ON COLUMN public.inventory_movements.quantity_after IS 'Stock level after this movement';
COMMENT ON COLUMN public.inventory_movements.reference_type IS 'Type of operation that caused this movement (sale, purchase, adjustment, etc.)';
COMMENT ON COLUMN public.inventory_movements.reference_id IS 'ID of the related record (e.g., sale_id, purchase_id)';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inv_movements_inventory_id
  ON public.inventory_movements (inventory_id);

CREATE INDEX IF NOT EXISTS idx_inv_movements_created_at
  ON public.inventory_movements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_movements_user_id
  ON public.inventory_movements (user_id);

CREATE INDEX IF NOT EXISTS idx_inv_movements_reference
  ON public.inventory_movements (reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_inv_movements_type
  ON public.inventory_movements (movement_type);

CREATE INDEX IF NOT EXISTS idx_inv_movements_inventory_created
  ON public.inventory_movements (inventory_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can only see their own inventory movements
DROP POLICY IF EXISTS "RLS_Inventory_Movements" ON public.inventory_movements;
CREATE POLICY "RLS_Inventory_Movements" ON public.inventory_movements
  USING (user_id = auth.uid());

-- GRANTs (no anon access)
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;

-- ============================================================================
-- STEP 3: PRICE HISTORY TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_price_history (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  cost_price numeric(12,2) NOT NULL,
  selling_price numeric(12,2) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.inventory_price_history IS 'Historical record of price changes for margin analysis';

-- Add index
CREATE INDEX IF NOT EXISTS idx_price_history_inventory
  ON public.inventory_price_history (inventory_id, changed_at DESC);

-- Enable RLS
ALTER TABLE public.inventory_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can see price history for their own inventory
DROP POLICY IF EXISTS "RLS_Price_History" ON public.inventory_price_history;
CREATE POLICY "RLS_Price_History" ON public.inventory_price_history
  USING (
    inventory_id IN (SELECT id FROM public.inventory WHERE user_id = auth.uid())
  );

-- GRANTs
GRANT SELECT ON public.inventory_price_history TO authenticated;
GRANT ALL ON public.inventory_price_history TO service_role;

-- Trigger to capture price changes
CREATE OR REPLACE FUNCTION public.track_price_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only record if prices actually changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.cost_price IS DISTINCT FROM NEW.cost_price
       OR OLD.selling_price IS DISTINCT FROM NEW.selling_price
    THEN
      INSERT INTO public.inventory_price_history
        (inventory_id, cost_price, selling_price, changed_by)
      VALUES
        (NEW.id, NEW.cost_price, NEW.selling_price, auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_price_history ON public.inventory;
CREATE TRIGGER trg_inventory_price_history
  AFTER UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.track_price_change();

-- ============================================================================
-- STEP 4: AUTOMATIC STOCK DEDUCTION ON SALE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_sale_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_current_qty integer;
  v_new_qty integer;
  v_inv_sizes jsonb;
BEGIN
  -- Only process if inventory_id and size are provided
  IF NEW.inventory_id IS NULL OR NEW.size IS NULL OR NEW.size = '' THEN
    RETURN NEW;
  END IF;

  -- =================================================================
  -- CASE 1: INSERT with status 'completed' → DEDUCT STOCK
  -- =================================================================
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    -- Lock the inventory row to prevent race conditions
    SELECT sizes INTO v_inv_sizes
    FROM public.inventory
    WHERE id = NEW.inventory_id
    FOR UPDATE;

    -- Get current quantity for this size
    v_current_qty := COALESCE((v_inv_sizes ->> NEW.size)::int, 0);
    v_new_qty := v_current_qty - NEW.quantity;

    -- Check for insufficient stock
    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for product ID % size %. Available: %, Requested: %',
        NEW.inventory_id, NEW.size, v_current_qty, NEW.quantity
        USING HINT = 'Please adjust the quantity or restock before completing this sale.';
    END IF;

    -- Update stock in inventory
    UPDATE public.inventory
      SET sizes = jsonb_set(sizes, ARRAY[NEW.size], to_jsonb(v_new_qty))
      WHERE id = NEW.inventory_id;

    -- Record movement in audit trail
    INSERT INTO public.inventory_movements
      (inventory_id, user_id, movement_type, size, quantity_change,
       quantity_before, quantity_after, reference_type, reference_id, notes)
    VALUES
      (NEW.inventory_id, NEW.user_id, 'sale', NEW.size, -NEW.quantity,
       v_current_qty, v_new_qty, 'sale', NEW.id,
       'Sale #' || NEW.id || ' - ' || NEW.product_name);

    RAISE NOTICE 'Stock deducted: product % size % decreased from % to %',
      NEW.inventory_id, NEW.size, v_current_qty, v_new_qty;
  END IF;

  -- =================================================================
  -- CASE 2: UPDATE from 'completed' to 'returned' or 'cancelled' → RESTORE STOCK
  -- =================================================================
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'completed'
     AND NEW.status IN ('returned', 'cancelled')
     AND OLD.inventory_id IS NOT NULL
     AND OLD.size IS NOT NULL
  THEN
    -- Lock the inventory row
    SELECT sizes INTO v_inv_sizes
    FROM public.inventory
    WHERE id = OLD.inventory_id
    FOR UPDATE;

    -- Get current quantity
    v_current_qty := COALESCE((v_inv_sizes ->> OLD.size)::int, 0);
    v_new_qty := v_current_qty + OLD.quantity;

    -- Update stock in inventory
    UPDATE public.inventory
      SET sizes = jsonb_set(sizes, ARRAY[OLD.size], to_jsonb(v_new_qty))
      WHERE id = OLD.inventory_id;

    -- Record movement
    INSERT INTO public.inventory_movements
      (inventory_id, user_id, movement_type, size, quantity_change,
       quantity_before, quantity_after, reference_type, reference_id, notes)
    VALUES
      (OLD.inventory_id, NEW.user_id,
       CASE WHEN NEW.status = 'returned' THEN 'return' ELSE 'cancel' END,
       OLD.size, OLD.quantity,
       v_current_qty, v_new_qty, 'sale', NEW.id,
       'Sale #' || NEW.id || ' ' || NEW.status || ' - stock restored');

    RAISE NOTICE 'Stock restored: product % size % increased from % to % (sale %)',
      OLD.inventory_id, OLD.size, v_current_qty, v_new_qty, NEW.status;
  END IF;

  -- =================================================================
  -- CASE 3: UPDATE quantity or size while status is still 'completed'
  -- =================================================================
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'completed'
     AND NEW.status = 'completed'
     AND (OLD.quantity <> NEW.quantity OR OLD.size <> NEW.size OR OLD.inventory_id <> NEW.inventory_id)
     AND OLD.inventory_id IS NOT NULL
  THEN
    -- First, restore the old stock
    SELECT sizes INTO v_inv_sizes
    FROM public.inventory
    WHERE id = OLD.inventory_id
    FOR UPDATE;

    v_current_qty := COALESCE((v_inv_sizes ->> OLD.size)::int, 0);
    v_new_qty := v_current_qty + OLD.quantity;

    UPDATE public.inventory
      SET sizes = jsonb_set(sizes, ARRAY[OLD.size], to_jsonb(v_new_qty))
      WHERE id = OLD.inventory_id;

    INSERT INTO public.inventory_movements
      (inventory_id, user_id, movement_type, size, quantity_change,
       quantity_before, quantity_after, reference_type, reference_id, notes)
    VALUES
      (OLD.inventory_id, NEW.user_id, 'adjustment', OLD.size, OLD.quantity,
       v_current_qty, v_new_qty, 'sale', NEW.id,
       'Sale #' || NEW.id || ' updated - old stock restored');

    -- Then, deduct the new stock (if inventory_id and size are present)
    IF NEW.inventory_id IS NOT NULL AND NEW.size IS NOT NULL THEN
      SELECT sizes INTO v_inv_sizes
      FROM public.inventory
      WHERE id = NEW.inventory_id
      FOR UPDATE;

      v_current_qty := COALESCE((v_inv_sizes ->> NEW.size)::int, 0);
      v_new_qty := v_current_qty - NEW.quantity;

      IF v_new_qty < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for updated sale. Product ID % size %. Available: %, Requested: %',
          NEW.inventory_id, NEW.size, v_current_qty, NEW.quantity;
      END IF;

      UPDATE public.inventory
        SET sizes = jsonb_set(sizes, ARRAY[NEW.size], to_jsonb(v_new_qty))
        WHERE id = NEW.inventory_id;

      INSERT INTO public.inventory_movements
        (inventory_id, user_id, movement_type, size, quantity_change,
         quantity_before, quantity_after, reference_type, reference_id, notes)
      VALUES
        (NEW.inventory_id, NEW.user_id, 'sale', NEW.size, -NEW.quantity,
         v_current_qty, v_new_qty, 'sale', NEW.id,
         'Sale #' || NEW.id || ' updated - new stock deducted');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_sales_stock_change ON public.sales;

-- Create trigger for automatic stock management
CREATE TRIGGER trg_sales_stock_change
  AFTER INSERT OR UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_stock_change();

COMMENT ON FUNCTION public.handle_sale_stock_change() IS 'Automatically manages inventory stock levels when sales are created, updated, returned, or cancelled';

-- ============================================================================
-- STEP 5: RECONCILIATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_inventory(p_inventory_id uuid)
RETURNS TABLE (
  size text,
  expected_qty integer,
  actual_qty integer,
  difference integer,
  status text
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
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
    COALESCE(cs.actual_qty, 0) - COALESCE(mt.expected_qty, 0) AS difference,
    CASE
      WHEN COALESCE(cs.actual_qty, 0) = COALESCE(mt.expected_qty, 0) THEN 'OK'
      WHEN COALESCE(cs.actual_qty, 0) > COALESCE(mt.expected_qty, 0) THEN 'SURPLUS'
      ELSE 'DEFICIT'
    END AS status
  FROM movement_totals mt
  FULL OUTER JOIN current_stock cs ON mt.size = cs.size
  ORDER BY size;
END;
$$;

COMMENT ON FUNCTION public.reconcile_inventory(uuid) IS 'Compares actual inventory stock with expected stock based on movement history. Returns discrepancies for audit.';

-- ============================================================================
-- STEP 6: LOW-STOCK ALERT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.low_stock_items AS
SELECT
  i.id,
  i.user_id,
  i.name,
  i.sku,
  i.barcode,
  i.category,
  i.subcategory,
  i.stock_total,
  i.selling_price,
  kv.key AS size,
  kv.value::int AS quantity,
  CASE
    WHEN kv.value::int = 0 THEN 'OUT_OF_STOCK'
    WHEN kv.value::int <= 2 THEN 'CRITICAL'
    WHEN kv.value::int <= 5 THEN 'LOW'
    ELSE 'OK'
  END AS alert_level
FROM public.inventory i,
     jsonb_each_text(i.sizes) kv
WHERE kv.value::int <= 5  -- threshold: show items with 5 or fewer units
  AND kv.value::int >= 0
ORDER BY kv.value::int ASC, i.name ASC;

COMMENT ON VIEW public.low_stock_items IS 'Shows inventory items with low or zero stock for each size, with alert levels';

-- Grant access to the view
GRANT SELECT ON public.low_stock_items TO authenticated;
GRANT ALL ON public.low_stock_items TO service_role;

-- ============================================================================
-- STEP 7: HELPER FUNCTION TO MANUALLY ADJUST STOCK
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
  p_inventory_id uuid,
  p_size text,
  p_quantity_change integer,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_current_qty integer;
  v_new_qty integer;
  v_inv_sizes jsonb;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user owns this inventory
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory
    WHERE id = p_inventory_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Inventory item % not found or access denied', p_inventory_id;
  END IF;

  -- Lock and get current inventory
  SELECT sizes, user_id INTO v_inv_sizes, v_user_id
  FROM public.inventory
  WHERE id = p_inventory_id
  FOR UPDATE;

  -- Get current quantity for size
  v_current_qty := COALESCE((v_inv_sizes ->> p_size)::int, 0);
  v_new_qty := v_current_qty + p_quantity_change;

  -- Prevent negative stock
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative stock. Current: %, Change: %, Result: %',
      v_current_qty, p_quantity_change, v_new_qty;
  END IF;

  -- Update inventory
  UPDATE public.inventory
    SET sizes = jsonb_set(sizes, ARRAY[p_size], to_jsonb(v_new_qty))
    WHERE id = p_inventory_id;

  -- Record movement
  INSERT INTO public.inventory_movements
    (inventory_id, user_id, movement_type, size, quantity_change,
     quantity_before, quantity_after, reference_type, notes)
  VALUES
    (p_inventory_id, v_user_id, 'adjustment', p_size, p_quantity_change,
     v_current_qty, v_new_qty, 'manual', p_notes);

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'inventory_id', p_inventory_id,
    'size', p_size,
    'quantity_before', v_current_qty,
    'quantity_after', v_new_qty,
    'quantity_change', p_quantity_change
  );
END;
$$;

COMMENT ON FUNCTION public.adjust_inventory_stock(uuid, text, integer, text) IS 'Manually adjust inventory stock for a specific size with audit trail. Use positive values to add stock, negative to reduce.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.adjust_inventory_stock(uuid, text, integer, text) TO authenticated;

-- ============================================================================
-- STEP 8: INITIAL STOCK SNAPSHOT (Run once after migration)
-- ============================================================================

-- This function creates initial movement records for all existing stock
-- Run this ONCE after the migration to establish a baseline for reconciliation
CREATE OR REPLACE FUNCTION public.initialize_inventory_movements()
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_inventory record;
  v_size record;
BEGIN
  -- Loop through all inventory items
  FOR v_inventory IN
    SELECT id, user_id, sizes, name
    FROM public.inventory
  LOOP
    -- Loop through all sizes in the JSONB
    FOR v_size IN
      SELECT key AS size, value::int AS quantity
      FROM jsonb_each_text(v_inventory.sizes)
      WHERE value::int > 0
    LOOP
      -- Create initial movement record
      INSERT INTO public.inventory_movements
        (inventory_id, user_id, movement_type, size, quantity_change,
         quantity_before, quantity_after, reference_type, notes)
      VALUES
        (v_inventory.id, v_inventory.user_id, 'initial', v_size.size, v_size.quantity,
         0, v_size.quantity, 'migration',
         'Initial stock snapshot for ' || v_inventory.name)
      ON CONFLICT DO NOTHING;  -- In case this is run multiple times
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.initialize_inventory_movements() IS 'One-time function to create initial movement records for existing inventory. Run after migration.';

-- ============================================================================
-- STEP 9: GRANT EXECUTE PERMISSIONS ON HELPER FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.reconcile_inventory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_inventory_movements() TO authenticated;
GRANT ALL ON FUNCTION public.reconcile_inventory(uuid) TO service_role;
GRANT ALL ON FUNCTION public.initialize_inventory_movements() TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Print completion message
DO $$
BEGIN
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Inventory system improvements migration completed successfully!';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'New features added:';
  RAISE NOTICE '  ✓ SKU and barcode support';
  RAISE NOTICE '  ✓ JSONB sizes validation';
  RAISE NOTICE '  ✓ Inventory movements audit trail';
  RAISE NOTICE '  ✓ Automatic stock deduction on sale';
  RAISE NOTICE '  ✓ Price history tracking';
  RAISE NOTICE '  ✓ Reconciliation function';
  RAISE NOTICE '  ✓ Low-stock alert view';
  RAISE NOTICE '  ✓ Manual stock adjustment function';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'IMPORTANT: Run the following to create initial movement records:';
  RAISE NOTICE '  SELECT public.initialize_inventory_movements();';
  RAISE NOTICE '==================================================================';
END $$;
