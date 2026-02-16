-- ============================================================================
-- INVENTORY SYSTEM - FUNCTION USAGE EXAMPLES
-- This file demonstrates how to use all new inventory functions
-- ============================================================================

-- ============================================================================
-- 1. INITIALIZE INVENTORY MOVEMENTS (Run once after migration)
-- ============================================================================

-- This creates baseline movement records for all existing stock
-- Run this immediately after applying the migrations
SELECT public.initialize_inventory_movements();

-- Expected output: Number of movement records created
-- Example: 245 (one for each size with stock > 0)

-- ============================================================================
-- 2. MANUALLY ADJUST STOCK
-- ============================================================================

-- Add stock (e.g., received new shipment)
SELECT public.adjust_inventory_stock(
  'YOUR-INVENTORY-ID-HERE'::uuid,  -- inventory_id
  'M',                               -- size
  10,                                -- quantity_change (positive = add)
  'Received shipment from supplier'  -- notes
);

-- Example output:
-- {
--   "success": true,
--   "inventory_id": "...",
--   "size": "M",
--   "quantity_before": 5,
--   "quantity_after": 15,
--   "quantity_change": 10
-- }

-- Remove stock (e.g., damaged items)
SELECT public.adjust_inventory_stock(
  'YOUR-INVENTORY-ID-HERE'::uuid,
  'L',
  -3,  -- negative = remove
  'Damaged items - removed from inventory'
);

-- Transfer stock between sizes (adjust down one, adjust up another)
SELECT public.adjust_inventory_stock(
  'YOUR-INVENTORY-ID-HERE'::uuid,
  'S',
  -2,
  'Transferred 2 units from S to M'
);

SELECT public.adjust_inventory_stock(
  'YOUR-INVENTORY-ID-HERE'::uuid,
  'M',
  2,
  'Received 2 units transferred from S'
);

-- ============================================================================
-- 3. RECONCILE INVENTORY (Check for discrepancies)
-- ============================================================================

-- Check a specific inventory item
SELECT * FROM public.reconcile_inventory('YOUR-INVENTORY-ID-HERE'::uuid);

-- Example output:
-- size | expected_qty | actual_qty | difference | status
-- -----+--------------+------------+------------+---------
-- S    |           10 |         10 |          0 | OK
-- M    |           15 |         15 |          0 | OK
-- L    |            8 |          9 |          1 | SURPLUS
-- XL   |            5 |          3 |         -2 | DEFICIT

-- Reconcile all inventory items for current user
DO $$
DECLARE
  v_inv record;
  v_discrepancy record;
BEGIN
  FOR v_inv IN
    SELECT id, name FROM inventory WHERE user_id = auth.uid()
  LOOP
    RAISE NOTICE 'Checking: %', v_inv.name;
    
    FOR v_discrepancy IN
      SELECT * FROM reconcile_inventory(v_inv.id)
      WHERE status != 'OK'
    LOOP
      RAISE WARNING '  % size % has % discrepancy (%)',
        v_inv.name,
        v_discrepancy.size,
        v_discrepancy.status,
        v_discrepancy.difference;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- 4. VIEW LOW STOCK ITEMS
-- ============================================================================

-- Get all items with low stock for current user
SELECT
  name,
  sku,
  category,
  size,
  quantity,
  alert_level,
  selling_price
FROM low_stock_items
WHERE user_id = auth.uid()
ORDER BY
  CASE alert_level
    WHEN 'OUT_OF_STOCK' THEN 1
    WHEN 'CRITICAL' THEN 2
    WHEN 'LOW' THEN 3
  END,
  name;

-- Get only out-of-stock items
SELECT * FROM low_stock_items
WHERE alert_level = 'OUT_OF_STOCK'
  AND user_id = auth.uid();

-- Get critical and out-of-stock items grouped by product
SELECT
  name,
  sku,
  category,
  jsonb_object_agg(size, quantity) AS sizes_low_stock,
  SUM(quantity) AS total_low_stock,
  MAX(CASE WHEN alert_level = 'OUT_OF_STOCK' THEN 1 ELSE 0 END) AS has_out_of_stock
FROM low_stock_items
WHERE user_id = auth.uid()
  AND alert_level IN ('OUT_OF_STOCK', 'CRITICAL')
GROUP BY name, sku, category
ORDER BY has_out_of_stock DESC, total_low_stock ASC;

-- ============================================================================
-- 5. VIEW INVENTORY MOVEMENTS (Audit Trail)
-- ============================================================================

-- Get all movements for a specific inventory item
SELECT
  movement_type,
  size,
  quantity_change,
  quantity_before,
  quantity_after,
  reference_type,
  notes,
  created_at
FROM inventory_movements
WHERE inventory_id = 'YOUR-INVENTORY-ID-HERE'::uuid
ORDER BY created_at DESC;

-- Get sales-related movements
SELECT
  im.movement_type,
  im.size,
  im.quantity_change,
  im.created_at,
  s.product_name,
  s.price,
  s.status
FROM inventory_movements im
LEFT JOIN sales s ON s.id = im.reference_id
WHERE im.inventory_id = 'YOUR-INVENTORY-ID-HERE'::uuid
  AND im.reference_type = 'sale'
ORDER BY im.created_at DESC;

-- Get daily stock changes summary
SELECT
  DATE(created_at) AS date,
  movement_type,
  SUM(quantity_change) AS total_change,
  COUNT(*) AS num_movements
FROM inventory_movements
WHERE inventory_id = 'YOUR-INVENTORY-ID-HERE'::uuid
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), movement_type
ORDER BY date DESC, movement_type;

-- Find all adjustments (manual changes)
SELECT
  i.name,
  im.size,
  im.quantity_change,
  im.quantity_before,
  im.quantity_after,
  im.notes,
  im.created_at
FROM inventory_movements im
JOIN inventory i ON i.id = im.inventory_id
WHERE im.movement_type = 'adjustment'
  AND im.user_id = auth.uid()
ORDER BY im.created_at DESC
LIMIT 50;

-- ============================================================================
-- 6. VIEW PRICE HISTORY
-- ============================================================================

-- Get price change history for an item
SELECT
  cost_price,
  selling_price,
  selling_price - cost_price AS margin,
  ROUND(((selling_price - cost_price) / NULLIF(cost_price, 0) * 100)::numeric, 2) AS margin_percent,
  changed_at,
  changed_by
FROM inventory_price_history
WHERE inventory_id = 'YOUR-INVENTORY-ID-HERE'::uuid
ORDER BY changed_at DESC;

-- Find items with recent price changes
SELECT
  i.name,
  i.sku,
  i.category,
  ph.cost_price AS old_cost,
  i.cost_price AS current_cost,
  ph.selling_price AS old_selling,
  i.selling_price AS current_selling,
  ph.changed_at
FROM inventory i
JOIN inventory_price_history ph ON ph.inventory_id = i.id
WHERE i.user_id = auth.uid()
  AND ph.changed_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ph.changed_at DESC;

-- Calculate average margin over time
SELECT
  DATE_TRUNC('month', changed_at) AS month,
  AVG(selling_price - cost_price) AS avg_margin,
  AVG(CASE
    WHEN cost_price > 0 THEN (selling_price - cost_price) / cost_price * 100
    ELSE 0
  END) AS avg_margin_percent,
  COUNT(DISTINCT inventory_id) AS items_changed
FROM inventory_price_history
WHERE changed_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', changed_at)
ORDER BY month DESC;

-- ============================================================================
-- 7. ACCOUNTANT ASSIGNMENTS (Multi-Tenant Access Control)
-- ============================================================================

-- As an OWNER: Grant an accountant access to your data
INSERT INTO accountant_assignments (owner_id, accountant_id)
VALUES (
  auth.uid(),  -- owner (you)
  'ACCOUNTANT-USER-ID-HERE'::uuid
);

-- As an OWNER: View all accountants assigned to you
SELECT
  aa.id,
  aa.accountant_id,
  p.store_name AS accountant_store,
  aa.created_at
FROM accountant_assignments aa
JOIN profiles p ON p.id = aa.accountant_id
WHERE aa.owner_id = auth.uid();

-- As an ACCOUNTANT: View all owners you have access to
SELECT
  aa.id,
  aa.owner_id,
  p.store_name AS owner_store,
  aa.created_at
FROM accountant_assignments aa
JOIN profiles p ON p.id = aa.owner_id
WHERE aa.accountant_id = auth.uid();

-- As an OWNER: Revoke accountant access
DELETE FROM accountant_assignments
WHERE owner_id = auth.uid()
  AND accountant_id = 'ACCOUNTANT-USER-ID-HERE'::uuid;

-- ============================================================================
-- 8. AUTOMATIC STOCK DEDUCTION EXAMPLES
-- ============================================================================

-- These operations now AUTOMATICALLY update stock via triggers
-- You don't need to manually adjust stock anymore!

-- Create a completed sale (stock is automatically deducted)
INSERT INTO sales (
  user_id,
  inventory_id,
  product_name,
  size,
  quantity,
  price,
  cost_price,
  payment_method,
  status,
  client_number
) VALUES (
  auth.uid(),
  'YOUR-INVENTORY-ID-HERE'::uuid,
  'Product Name',
  'M',
  2,  -- Will deduct 2 units from size M
  100.00,
  60.00,
  'cash',
  'completed',  -- IMPORTANT: stock only deducts for 'completed' status
  '001'
) RETURNING id, product_name, quantity, size;

-- Return a sale (stock is automatically restored)
UPDATE sales
SET status = 'returned'
WHERE id = 'YOUR-SALE-ID-HERE'::uuid;
-- Stock is now restored automatically!

-- Cancel a sale (stock is automatically restored)
UPDATE sales
SET status = 'cancelled'
WHERE id = 'YOUR-SALE-ID-HERE'::uuid;

-- Create a pending sale (no stock deduction yet)
INSERT INTO sales (
  user_id,
  inventory_id,
  product_name,
  size,
  quantity,
  price,
  payment_method,
  status,  -- 'pending' = no stock deduction
  client_number
) VALUES (
  auth.uid(),
  'YOUR-INVENTORY-ID-HERE'::uuid,
  'Product Name',
  'L',
  1,
  100.00,
  'cash',
  'pending',  -- Stock NOT deducted yet
  '002'
) RETURNING id;

-- Later, complete the pending sale (stock is now deducted)
UPDATE sales
SET status = 'completed'
WHERE id = 'YOUR-PENDING-SALE-ID'::uuid;

-- ============================================================================
-- 9. COMPREHENSIVE INVENTORY REPORT
-- ============================================================================

-- Get full inventory status with movement counts
SELECT
  i.name,
  i.sku,
  i.barcode,
  i.category,
  i.subcategory,
  i.material,
  i.cost_price,
  i.selling_price,
  i.selling_price - i.cost_price AS margin,
  i.stock_total,
  i.sizes,
  COUNT(DISTINCT im.id) AS total_movements,
  SUM(CASE WHEN im.movement_type = 'sale' THEN 1 ELSE 0 END) AS total_sales,
  SUM(CASE WHEN im.movement_type = 'return' THEN 1 ELSE 0 END) AS total_returns,
  SUM(CASE WHEN im.movement_type = 'adjustment' THEN 1 ELSE 0 END) AS total_adjustments,
  MAX(im.created_at) AS last_movement_date
FROM inventory i
LEFT JOIN inventory_movements im ON im.inventory_id = i.id
WHERE i.user_id = auth.uid()
GROUP BY i.id, i.name, i.sku, i.barcode, i.category, i.subcategory,
         i.material, i.cost_price, i.selling_price, i.stock_total, i.sizes
ORDER BY i.name;

-- ============================================================================
-- 10. ERROR HANDLING EXAMPLES
-- ============================================================================

-- Example 1: Try to sell more than available (will fail)
DO $$
BEGIN
  INSERT INTO sales (
    user_id,
    inventory_id,
    product_name,
    size,
    quantity,
    price,
    payment_method,
    status,
    client_number
  ) VALUES (
    auth.uid(),
    'YOUR-INVENTORY-ID-HERE'::uuid,
    'Test Product',
    'M',
    999,  -- Way more than available
    100.00,
    'cash',
    'completed',
    '999'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Expected error: %', SQLERRM;
END $$;

-- Example 2: Try to adjust stock to negative (will fail)
DO $$
BEGIN
  PERFORM adjust_inventory_stock(
    'YOUR-INVENTORY-ID-HERE'::uuid,
    'M',
    -999,  -- Remove more than available
    'Test negative adjustment'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Expected error: %', SQLERRM;
END $$;

-- ============================================================================
-- 11. HELPFUL MONITORING QUERIES
-- ============================================================================

-- Total movements by type today
SELECT
  movement_type,
  COUNT(*) AS count,
  SUM(ABS(quantity_change)) AS total_units
FROM inventory_movements
WHERE user_id = auth.uid()
  AND created_at >= CURRENT_DATE
GROUP BY movement_type
ORDER BY count DESC;

-- Items with most activity
SELECT
  i.name,
  i.sku,
  COUNT(im.id) AS movement_count,
  SUM(CASE WHEN im.movement_type = 'sale' THEN im.quantity_change ELSE 0 END) AS units_sold,
  SUM(CASE WHEN im.movement_type = 'return' THEN im.quantity_change ELSE 0 END) AS units_returned
FROM inventory i
LEFT JOIN inventory_movements im ON im.inventory_id = i.id
WHERE i.user_id = auth.uid()
  AND im.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY i.id, i.name, i.sku
ORDER BY movement_count DESC
LIMIT 10;

-- Stock accuracy check across all inventory
SELECT
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE stock_total = 0) AS out_of_stock_items,
  COUNT(*) FILTER (WHERE stock_total <= 5) AS low_stock_items,
  AVG(stock_total) AS avg_stock_level,
  SUM(stock_total) AS total_units_in_stock
FROM inventory
WHERE user_id = auth.uid();

-- ============================================================================
-- DONE!
-- ============================================================================
-- These examples cover all the new inventory functions and features.
-- Adapt them to your application's needs.
-- ============================================================================
