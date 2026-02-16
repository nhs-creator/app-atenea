-- ============================================================================
-- INVENTORY SYSTEM TEST SCRIPT
-- Run this after applying both migrations to verify everything works
-- ============================================================================

-- ============================================================================
-- TEST 1: Verify tables and columns exist
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== TEST 1: Verifying Schema Changes ===';
  
  -- Check inventory columns
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'inventory' AND column_name = 'sku') THEN
    RAISE NOTICE '✓ inventory.sku column exists';
  ELSE
    RAISE WARNING '✗ inventory.sku column missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'inventory' AND column_name = 'barcode') THEN
    RAISE NOTICE '✓ inventory.barcode column exists';
  ELSE
    RAISE WARNING '✗ inventory.barcode column missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'inventory' AND column_name = 'updated_at') THEN
    RAISE NOTICE '✓ inventory.updated_at column exists';
  ELSE
    RAISE WARNING '✗ inventory.updated_at column missing';
  END IF;
  
  -- Check new tables
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'inventory_movements') THEN
    RAISE NOTICE '✓ inventory_movements table exists';
  ELSE
    RAISE WARNING '✗ inventory_movements table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'inventory_price_history') THEN
    RAISE NOTICE '✓ inventory_price_history table exists';
  ELSE
    RAISE WARNING '✗ inventory_price_history table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'accountant_assignments') THEN
    RAISE NOTICE '✓ accountant_assignments table exists';
  ELSE
    RAISE WARNING '✗ accountant_assignments table missing';
  END IF;
END $$;

-- ============================================================================
-- TEST 2: Verify functions exist
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 2: Verifying Functions ===';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_sale_stock_change') THEN
    RAISE NOTICE '✓ handle_sale_stock_change() function exists';
  ELSE
    RAISE WARNING '✗ handle_sale_stock_change() function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'adjust_inventory_stock') THEN
    RAISE NOTICE '✓ adjust_inventory_stock() function exists';
  ELSE
    RAISE WARNING '✗ adjust_inventory_stock() function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reconcile_inventory') THEN
    RAISE NOTICE '✓ reconcile_inventory() function exists';
  ELSE
    RAISE WARNING '✗ reconcile_inventory() function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'initialize_inventory_movements') THEN
    RAISE NOTICE '✓ initialize_inventory_movements() function exists';
  ELSE
    RAISE WARNING '✗ initialize_inventory_movements() function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'track_price_change') THEN
    RAISE NOTICE '✓ track_price_change() function exists';
  ELSE
    RAISE WARNING '✗ track_price_change() function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_client_stats') THEN
    RAISE NOTICE '✓ sync_client_stats() function exists';
  ELSE
    RAISE WARNING '✗ sync_client_stats() function missing';
  END IF;
END $$;

-- ============================================================================
-- TEST 3: Verify views exist
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 3: Verifying Views ===';
  
  IF EXISTS (SELECT 1 FROM information_schema.views 
             WHERE table_name = 'low_stock_items') THEN
    RAISE NOTICE '✓ low_stock_items view exists';
  ELSE
    RAISE WARNING '✗ low_stock_items view missing';
  END IF;
END $$;

-- ============================================================================
-- TEST 4: Verify triggers exist
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 4: Verifying Triggers ===';
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sales_stock_change') THEN
    RAISE NOTICE '✓ trg_sales_stock_change trigger exists';
  ELSE
    RAISE WARNING '✗ trg_sales_stock_change trigger missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_price_history') THEN
    RAISE NOTICE '✓ trg_inventory_price_history trigger exists';
  ELSE
    RAISE WARNING '✗ trg_inventory_price_history trigger missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_updated_at') THEN
    RAISE NOTICE '✓ trg_inventory_updated_at trigger exists';
  ELSE
    RAISE WARNING '✗ trg_inventory_updated_at trigger missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sales_sync_client_stats') THEN
    RAISE NOTICE '✓ trg_sales_sync_client_stats trigger exists';
  ELSE
    RAISE WARNING '✗ trg_sales_sync_client_stats trigger missing';
  END IF;
END $$;

-- ============================================================================
-- TEST 5: Verify indexes exist
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 5: Verifying Critical Indexes ===';
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sales_user_id') THEN
    RAISE NOTICE '✓ idx_sales_user_id index exists';
  ELSE
    RAISE WARNING '✗ idx_sales_user_id index missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_user_id') THEN
    RAISE NOTICE '✓ idx_inventory_user_id index exists';
  ELSE
    RAISE WARNING '✗ idx_inventory_user_id index missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inv_movements_inventory_id') THEN
    RAISE NOTICE '✓ idx_inv_movements_inventory_id index exists';
  ELSE
    RAISE WARNING '✗ idx_inv_movements_inventory_id index missing';
  END IF;
END $$;

-- ============================================================================
-- TEST 6: Check inventory movements count
-- ============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 6: Initial Movements Status ===';
  
  SELECT COUNT(*) INTO v_count FROM inventory_movements;
  
  IF v_count = 0 THEN
    RAISE WARNING '⚠ No inventory movements found. Run: SELECT initialize_inventory_movements();';
  ELSE
    RAISE NOTICE '✓ Found % inventory movement records', v_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 7: Sample query - Low stock items
-- ============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 7: Low Stock Items ===';
  
  SELECT COUNT(*) INTO v_count FROM low_stock_items;
  
  RAISE NOTICE 'Found % items with low stock', v_count;
END $$;

-- ============================================================================
-- TEST 8: Verify RLS policies
-- ============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 8: RLS Policies ===';
  
  -- Check expenses policies
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'expenses'
    AND policyname IN ('RLS_Expenses_Owner_Full_Access', 'RLS_Expenses_Accountant_Read_Only');
  
  IF v_count = 2 THEN
    RAISE NOTICE '✓ Expenses RLS policies configured';
  ELSE
    RAISE WARNING '✗ Expected 2 expenses policies, found %', v_count;
  END IF;
  
  -- Check sales policies
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'sales'
    AND policyname IN ('RLS_Sales_Owner_Full_Access', 'RLS_Sales_Accountant_Read_Only');
  
  IF v_count = 2 THEN
    RAISE NOTICE '✓ Sales RLS policies configured';
  ELSE
    RAISE WARNING '✗ Expected 2 sales policies, found %', v_count;
  END IF;
  
  -- Check inventory_movements policy
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'inventory_movements'
    AND policyname = 'RLS_Inventory_Movements';
  
  IF v_count = 1 THEN
    RAISE NOTICE '✓ Inventory movements RLS policy configured';
  ELSE
    RAISE WARNING '✗ Inventory movements policy missing';
  END IF;
END $$;

-- ============================================================================
-- TEST 9: Verify constraints
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 9: Constraints ===';
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE table_name = 'inventory' 
             AND constraint_name = 'inventory_sizes_valid') THEN
    RAISE NOTICE '✓ inventory_sizes_valid constraint exists';
  ELSE
    RAISE WARNING '✗ inventory_sizes_valid constraint missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE table_name = 'inventory' 
             AND constraint_name = 'inventory_stock_total_non_negative') THEN
    RAISE NOTICE '✓ inventory_stock_total_non_negative constraint exists';
  ELSE
    RAISE WARNING '✗ inventory_stock_total_non_negative constraint missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE table_name = 'inventory_movements' 
             AND constraint_name = 'movement_type_check') THEN
    RAISE NOTICE '✓ movement_type_check constraint exists';
  ELSE
    RAISE WARNING '✗ movement_type_check constraint missing';
  END IF;
END $$;

-- ============================================================================
-- TEST 10: Summary
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Migration verification complete!';
  RAISE NOTICE 'Review the output above for any warnings (✗ or ⚠).';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. If movements are empty, run: SELECT initialize_inventory_movements();';
  RAISE NOTICE '2. Test creating a sale to verify stock deduction';
  RAISE NOTICE '3. Test returning a sale to verify stock restoration';
  RAISE NOTICE '4. Check reconciliation: SELECT * FROM reconcile_inventory(''your-id'');';
  RAISE NOTICE '==================================================================';
END $$;
