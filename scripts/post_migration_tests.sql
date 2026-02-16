-- ============================================================================
-- POST-MIGRATION QUICK TESTS
-- Run these in Supabase SQL Editor after migration completes
-- ============================================================================

-- STEP 1: Initialize inventory movements (REQUIRED - run this first!)
-- This creates baseline movement records for all existing stock
SELECT public.initialize_inventory_movements();
-- Expected: Returns a number (e.g., 150) indicating movement records created

-- ============================================================================
-- STEP 2: View what was created
-- ============================================================================

-- Check movement records were created
SELECT 
  COUNT(*) as total_movements,
  COUNT(DISTINCT inventory_id) as items_with_movements
FROM inventory_movements;
-- Expected: Should see counts > 0

-- ============================================================================
-- STEP 3: View your current inventory with new columns
-- ============================================================================

SELECT 
  id,
  name,
  sku,           -- NEW COLUMN
  barcode,       -- NEW COLUMN
  category,
  stock_total,
  sizes,
  updated_at     -- RENAMED from last_updated
FROM inventory
LIMIT 5;

-- ============================================================================
-- STEP 4: Check low stock items
-- ============================================================================

SELECT 
  name,
  category,
  size,
  quantity,
  alert_level
FROM low_stock_items
LIMIT 10;
-- If empty, that's OK - means you don't have low stock items

-- ============================================================================
-- STEP 5: View movement history for one item
-- ============================================================================

-- Pick an inventory item and see its movement history
SELECT 
  i.name,
  im.movement_type,
  im.size,
  im.quantity_change,
  im.quantity_before,
  im.quantity_after,
  im.created_at,
  im.notes
FROM inventory_movements im
JOIN inventory i ON i.id = im.inventory_id
WHERE im.user_id = auth.uid()
ORDER BY im.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 6: Test reconciliation (should show everything is OK)
-- ============================================================================

-- Replace 'YOUR-INVENTORY-ID' with an actual inventory ID from your database
-- Get an ID first:
SELECT id, name FROM inventory LIMIT 1;

-- Then use that ID here (uncomment and replace the ID):
-- SELECT * FROM reconcile_inventory('paste-id-here'::uuid);
-- Expected: Should show all sizes with status 'OK'

-- ============================================================================
-- STEP 7: View new tables
-- ============================================================================

-- Accountant assignments (for multi-user access control)
SELECT * FROM accountant_assignments;
-- Expected: Probably empty unless you have accountants

-- Price history
SELECT 
  i.name,
  ph.cost_price,
  ph.selling_price,
  ph.changed_at
FROM inventory_price_history ph
JOIN inventory i ON i.id = ph.inventory_id
ORDER BY ph.changed_at DESC
LIMIT 10;
-- Expected: Probably empty for now - will populate when you change prices

-- ============================================================================
-- STEP 8: Check that automatic stock deduction is enabled
-- ============================================================================

-- Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_sales_stock_change';
-- Expected: Should show the trigger on the sales table

-- ============================================================================
-- SUCCESS! If all above queries ran without errors, you're good to go!
-- ============================================================================

-- Summary of what you now have:
SELECT 
  'Tables' as type, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('inventory_movements', 'inventory_price_history', 'accountant_assignments')
UNION ALL
SELECT 
  'Functions' as type, COUNT(*) 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('adjust_inventory_stock', 'reconcile_inventory', 'initialize_inventory_movements')
UNION ALL
SELECT 
  'Views' as type, COUNT(*) 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'low_stock_items';
-- Expected: Should show 3 tables, 3 functions, 1 view

-- ============================================================================
-- NOTES FOR YOUR APPLICATION CODE
-- ============================================================================

/*
IMPORTANT: Update your application code:

1. Remove manual stock deduction code
   - The database now handles stock automatically via triggers
   - Just create/update sales with status='completed' and stock updates automatically

2. Update column references
   - inventory.last_updated → inventory.updated_at

3. Your payment methods are in Spanish:
   - Efectivo (cash)
   - Débito (debit)
   - Crédito (credit)
   - Transferencia (transfer)
   
   These are fine! The payment_method constraint was skipped to preserve your data.

4. Add error handling for insufficient stock:
   - Creating a sale can now fail if quantity > available stock
   - Catch errors that include "Insufficient stock"

See docs/IMPLEMENTATION_SUMMARY.md for detailed code changes.
*/
