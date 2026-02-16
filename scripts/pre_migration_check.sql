-- ============================================================================
-- PRE-MIGRATION DATA CHECK
-- Run this BEFORE applying migrations to identify potential issues
-- ============================================================================

DO $$
DECLARE
  v_null_count integer;
  v_methods text;
BEGIN
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'PRE-MIGRATION DATA CHECK';
  RAISE NOTICE '==================================================================';
  
  -- Check 1: NULL user_id in clients
  SELECT COUNT(*) INTO v_null_count
  FROM public.clients
  WHERE user_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'Found % clients with NULL user_id - migration will fail!', v_null_count;
    RAISE NOTICE 'Fix: UPDATE clients SET user_id = ''your-user-id'' WHERE user_id IS NULL;';
  ELSE
    RAISE NOTICE '✓ All clients have user_id';
  END IF;
  
  -- Check 2: Payment methods
  RAISE NOTICE '';
  RAISE NOTICE '--- Payment Methods Check ---';
  
  SELECT string_agg(DISTINCT payment_method, ', ' ORDER BY payment_method)
  INTO v_methods
  FROM public.sales;
  
  RAISE NOTICE 'Existing payment methods: %', v_methods;
  
  -- Check 3: JSONB sizes validation
  RAISE NOTICE '';
  RAISE NOTICE '--- Inventory Sizes Check ---';
  
  SELECT COUNT(*) INTO v_null_count
  FROM public.inventory
  WHERE jsonb_typeof(sizes) != 'object';
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'Found % inventory items with invalid sizes JSONB', v_null_count;
  ELSE
    RAISE NOTICE '✓ All inventory sizes are valid objects';
  END IF;
  
  -- Check if any sizes have non-numeric values
  SELECT COUNT(*) INTO v_null_count
  FROM public.inventory,
       jsonb_each_text(sizes) AS kv
  WHERE kv.value !~ '^\d+$';
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'Found % inventory size entries with non-numeric values', v_null_count;
    RAISE NOTICE 'Run this to see them: SELECT id, name, sizes FROM inventory WHERE EXISTS (SELECT 1 FROM jsonb_each_text(sizes) kv WHERE kv.value !~ ''^\d+$'');';
  ELSE
    RAISE NOTICE '✓ All inventory size values are numeric';
  END IF;
  
  -- Check 4: Negative stock_total
  SELECT COUNT(*) INTO v_null_count
  FROM public.inventory
  WHERE stock_total < 0;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'Found % inventory items with negative stock_total', v_null_count;
  ELSE
    RAISE NOTICE '✓ No negative stock_total values';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Pre-migration check complete!';
  RAISE NOTICE '==================================================================';
END $$;

-- Show detailed payment method breakdown
SELECT 
  payment_method,
  COUNT(*) as count,
  MIN(date) as first_used,
  MAX(date) as last_used
FROM public.sales
GROUP BY payment_method
ORDER BY count DESC;
