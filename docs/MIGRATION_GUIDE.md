# Database Migration Guide — Inventory System & Security Fixes

> **Generated**: 2026-02-16  
> **Based on**: Schema Audit Report  
> **Risk Level**: Medium to High — includes breaking RLS policy changes

---

## Overview

This guide covers the application of two critical migrations:

1. **`20260216155000_critical_security_fixes.sql`** — Fixes cross-tenant data leaks, adds indexes, and improves security
2. **`20260216160000_inventory_system_improvements.sql`** — Adds SKU/barcode support, movement tracking, automatic stock deduction, and audit trail

---

## ⚠️ Pre-Migration Checklist

- [ ] **Backup your database** — Run a full backup before proceeding
- [ ] **Test in staging first** — Apply these migrations to a staging environment
- [ ] **Run pre-migration check** — Execute `scripts/pre_migration_check.sql` to identify data issues
- [ ] **Review current data** — Check for NULL `user_id` in `clients` table
- [ ] **Check payment methods** — Verify your payment method values
- [ ] **Notify users** — Some operations may be slower during migration
- [ ] **Schedule downtime** — For production, plan a maintenance window (5-10 minutes)
- [ ] **Review RLS changes** — The security fixes change who can access what data

---

## Migration Order (CRITICAL)

**You MUST apply migrations in this order:**

1. First: `20260216155000_critical_security_fixes.sql`
2. Second: `20260216160000_inventory_system_improvements.sql`

The inventory improvements depend on indexes and constraints from the security fixes.

---

## Method 1: Using Supabase CLI (Recommended)

### Step 1: Verify Supabase CLI is linked

```powershell
npx supabase status
```

If not linked, run:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Step 2: Apply migrations

```powershell
# Apply security fixes first
npx supabase db push

# This will apply both migrations in order based on timestamps
```

### Step 3: Verify migrations

```powershell
# Check applied migrations
npx supabase migration list
```

---

## Method 2: Direct SQL Execution

If you prefer to apply migrations manually via the Supabase Dashboard:

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**

### Step 2: Apply Security Fixes

1. Copy the entire contents of `supabase/migrations/20260216155000_critical_security_fixes.sql`
2. Paste into SQL Editor
3. Click **Run** or press `Ctrl+Enter`
4. **Wait for completion** (may take 30-60 seconds)
5. Check for errors in the output

### Step 3: Apply Inventory Improvements

1. Copy the entire contents of `supabase/migrations/20260216160000_inventory_system_improvements.sql`
2. Paste into SQL Editor
3. Click **Run**
4. **Wait for completion** (may take 30-60 seconds)
5. Check for errors in the output

### Step 4: Initialize Inventory Movements

After the second migration completes, run this to create baseline movement records:

```sql
SELECT public.initialize_inventory_movements();
```

This creates "initial" movement records for all existing stock, enabling accurate reconciliation.

---

## Post-Migration Steps

### 1. Verify Security Policies

Test that RLS is working correctly:

```sql
-- As an owner, verify you can only see your own data
SELECT COUNT(*) FROM sales;  -- Should only show your sales

-- As an accountant, verify you need an assignment
SELECT COUNT(*) FROM sales;  -- Should be 0 until owner assigns you
```

### 2. Assign Accountants to Owners

If you have accountant users, owners must now explicitly grant them access:

```sql
-- As an owner, grant access to an accountant
INSERT INTO public.accountant_assignments (owner_id, accountant_id)
VALUES (
  'owner-user-id-uuid',
  'accountant-user-id-uuid'
);
```

**Update your application UI** to allow owners to manage accountant assignments.

### 3. Test Automatic Stock Deduction

Create a test sale with a completed status:

```sql
-- This should automatically deduct stock and create a movement record
INSERT INTO sales (user_id, inventory_id, product_name, quantity, size, price, payment_method, status)
VALUES (
  auth.uid(),
  'your-inventory-item-id',
  'Test Product',
  1,
  'M',
  100.00,
  'cash',
  'completed'
);

-- Check that stock was deducted
SELECT name, sizes FROM inventory WHERE id = 'your-inventory-item-id';

-- Check that a movement was recorded
SELECT * FROM inventory_movements WHERE reference_type = 'sale' ORDER BY created_at DESC LIMIT 1;
```

### 4. Test Stock Return/Cancellation

```sql
-- Update sale to returned status
UPDATE sales
SET status = 'returned'
WHERE id = 'your-test-sale-id';

-- Verify stock was restored
SELECT name, sizes FROM inventory WHERE id = 'your-inventory-item-id';

-- Check movement record
SELECT * FROM inventory_movements WHERE reference_type = 'sale' AND movement_type = 'return' ORDER BY created_at DESC LIMIT 1;
```

### 5. Run Reconciliation Check

Verify inventory integrity:

```sql
-- Check for discrepancies (should return no rows if everything is correct)
SELECT * FROM public.reconcile_inventory('your-inventory-item-id');
```

### 6. Check Low Stock Alerts

```sql
-- View items with low stock
SELECT * FROM public.low_stock_items;
```

### 7. Update Application Code

#### Required Changes:

1. **Remove manual stock deduction code** — The database now handles this automatically via triggers
2. **Add SKU/barcode fields** to inventory forms
3. **Add accountant assignment UI** for owners
4. **Update inventory queries** to use `updated_at` instead of `last_updated`
5. **Handle insufficient stock errors** — The trigger will raise an exception if stock is insufficient

#### Example Error Handling (TypeScript):

```typescript
try {
  const { data, error } = await supabase
    .from('sales')
    .insert({
      inventory_id: productId,
      size: selectedSize,
      quantity: qty,
      status: 'completed',
      // ... other fields
    });

  if (error) {
    // Check for insufficient stock error
    if (error.message.includes('Insufficient stock')) {
      alert('Not enough stock available for this sale');
    }
    throw error;
  }
} catch (err) {
  console.error('Sale creation failed:', err);
}
```

#### Optional Features to Add:

1. **Movement history view** — Show `inventory_movements` table in your UI
2. **Reconciliation reports** — Call `reconcile_inventory()` function
3. **Low stock alerts** — Query `low_stock_items` view
4. **Manual adjustments** — Use `adjust_inventory_stock()` function
5. **Price history tracking** — Query `inventory_price_history` table

---

## Rollback Plan (If Needed)

If something goes wrong, you can rollback:

### Using Supabase CLI:

```powershell
# This is NOT supported by Supabase CLI — manual rollback required
```

### Manual Rollback:

Create a rollback script:

```sql
-- Rollback inventory improvements
DROP TRIGGER IF EXISTS trg_sales_stock_change ON public.sales;
DROP TRIGGER IF EXISTS trg_inventory_price_history ON public.inventory;
DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;

DROP FUNCTION IF EXISTS public.handle_sale_stock_change();
DROP FUNCTION IF EXISTS public.track_price_change();
DROP FUNCTION IF EXISTS public.adjust_inventory_stock(uuid, text, integer, text);
DROP FUNCTION IF EXISTS public.reconcile_inventory(uuid);
DROP FUNCTION IF EXISTS public.initialize_inventory_movements();

DROP VIEW IF EXISTS public.low_stock_items;
DROP TABLE IF EXISTS public.inventory_price_history;
DROP TABLE IF EXISTS public.inventory_movements;

ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_sizes_valid;
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_stock_total_non_negative;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS sku;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS barcode;
ALTER TABLE public.inventory RENAME COLUMN updated_at TO last_updated;

-- Rollback security fixes
DROP TRIGGER IF EXISTS trg_sales_sync_client_stats ON public.sales;
DROP FUNCTION IF EXISTS public.sync_client_stats();
DROP TABLE IF EXISTS public.accountant_assignments;

-- Restore original RLS policies (from backup)
-- ... restore from your schema backup ...
```

⚠️ **Important**: Before rollback, export critical data from new tables (`inventory_movements`, `inventory_price_history`) if you want to preserve it.

---

## Troubleshooting

### Issue: "check constraint sales_payment_method_check is violated by some row"

**Cause**: Your database has sales with payment methods not in the constraint list

**Fix**: This constraint has been made optional in the migration. The migration will now succeed and just report what payment methods exist. To add the constraint later:

```sql
-- Step 1: Check what payment methods you have
SELECT DISTINCT payment_method, COUNT(*) 
FROM sales 
GROUP BY payment_method;

-- Step 2: Standardize them if needed (example)
UPDATE sales SET payment_method = 'card' 
WHERE payment_method IN ('tarjeta', 'credito', 'credit');

-- Step 3: Add constraint once standardized
ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'transfer', 'mixed', 'voucher'));
```

### Issue: "clients.user_id violates not null constraint"

**Cause**: Existing clients with NULL `user_id`

**Fix**: Before running the migration, update NULL values:

```sql
-- Find clients with NULL user_id
SELECT id, name, phone FROM clients WHERE user_id IS NULL;

-- Assign them to a default user (or delete orphaned records)
UPDATE clients SET user_id = 'your-user-id' WHERE user_id IS NULL;

-- Then re-run the migration
```

### Issue: "Insufficient stock" errors on existing sales

**Cause**: Your current inventory doesn't have enough stock for the sizes being sold

**Fix**: This is expected. The trigger only applies to NEW sales after migration. Existing sales are unaffected.

### Issue: "Movement records not created"

**Cause**: `initialize_inventory_movements()` was not run

**Fix**:

```sql
SELECT public.initialize_inventory_movements();
```

### Issue: "RLS policy blocks my queries"

**Cause**: The new RLS policies are more restrictive

**Fix**: Verify your user's role in the `profiles` table:

```sql
SELECT * FROM profiles WHERE id = auth.uid();
```

If you're an owner, ensure you're querying your own data. If you're an accountant, ensure an owner has added you to `accountant_assignments`.

### Issue: "Performance is slower after migration"

**Cause**: Indexes are being built or RLS subqueries are not optimized

**Fix**:
1. Wait 5-10 minutes for indexes to finish building
2. Run `ANALYZE` to update statistics:

```sql
ANALYZE public.sales;
ANALYZE public.expenses;
ANALYZE public.inventory;
ANALYZE public.clients;
```

3. Consider implementing JWT claims optimization (see audit report section 1.5)

---

## New Functions Available

### 1. Adjust Stock Manually

```sql
SELECT public.adjust_inventory_stock(
  'inventory-item-id'::uuid,
  'M',           -- size
  10,            -- quantity change (positive = add, negative = remove)
  'Received restock shipment'  -- notes
);
```

### 2. Reconcile Inventory

```sql
SELECT * FROM public.reconcile_inventory('inventory-item-id'::uuid);
```

Returns discrepancies between expected and actual stock.

### 3. Low Stock Alerts

```sql
SELECT * FROM public.low_stock_items WHERE user_id = auth.uid();
```

### 4. Price History

```sql
SELECT * FROM public.inventory_price_history
WHERE inventory_id = 'your-item-id'
ORDER BY changed_at DESC;
```

---

## Performance Impact

**Expected changes:**

| Operation | Before | After | Notes |
|-----------|--------|-------|-------|
| Insert sale | ~50ms | ~80ms | Includes stock deduction + movement record |
| Query sales | ~100ms | ~30ms | New indexes dramatically improve filters |
| Query inventory | ~50ms | ~50ms | No change |
| Return/cancel sale | ~50ms | ~100ms | Includes stock restoration + movement |

**Overall**: Writes are slightly slower (more integrity), reads are much faster (better indexes).

---

## Monitoring Recommendations

After migration, monitor:

1. **Error rates** — Look for "Insufficient stock" errors
2. **Movement records** — Verify they're being created for all sales
3. **RLS policy performance** — Watch for slow queries with role checks
4. **Stock accuracy** — Run periodic reconciliation reports

---

## Support

If you encounter issues:

1. Check the Supabase logs: Dashboard → Logs → Database
2. Review the audit report: `docs/SCHEMA_AUDIT_REPORT.md`
3. Check for SQL errors in the migration output
4. Verify your data meets the new constraints (NOT NULL, CHECK, etc.)

---

## Next Steps

After successful migration:

1. ✅ Test all CRUD operations in your app
2. ✅ Add accountant assignment UI (if applicable)
3. ✅ Update frontend to show SKU/barcode fields
4. ✅ Add inventory movement history view
5. ✅ Add low-stock alerts dashboard
6. ✅ Remove manual stock deduction code
7. ✅ Add error handling for insufficient stock
8. ✅ Consider implementing JWT claims optimization (Phase 4 in audit report)

---

## Summary of Changes

### Security Fixes

- ✅ Cross-tenant data leaks fixed in RLS policies
- ✅ Anon access revoked from all tables
- ✅ Accountant-owner relationship table added
- ✅ 10+ performance indexes added
- ✅ Consistent FK ON DELETE behavior

### Inventory Improvements

- ✅ SKU and barcode columns
- ✅ JSONB sizes validation
- ✅ Automatic stock deduction on sale
- ✅ Automatic stock restoration on return/cancel
- ✅ Complete movement audit trail
- ✅ Price history tracking
- ✅ Reconciliation function
- ✅ Low-stock alert view
- ✅ Manual stock adjustment function

**Total new tables**: 3  
**Total new functions**: 5  
**Total new views**: 1  
**Total new triggers**: 5  
**Total new indexes**: 15+
