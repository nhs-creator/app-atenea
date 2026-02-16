# Migration Troubleshooting Guide

## Error You're Seeing

```
ERROR: check constraint "sales_payment_method_check" of relation "sales" is violated by some row
```

## What Happened

The migration tried to add a constraint that requires `payment_method` to be one of:
- `cash`, `card`, `transfer`, `mixed`, `voucher`, `debit`

But your database has sales with payment method values that aren't in that list.

## ✅ SOLUTION - Migration Fixed!

I've updated the migration file to skip this constraint for now. Here's what to do:

### Step 1: Try the Migration Again

```powershell
npx supabase db push
```

The migration should now succeed! It will:
- Skip the problematic payment_method constraint
- Show you what payment methods exist in your database
- Complete all other critical security fixes

### Step 2: (Optional) Standardize Payment Methods Later

After migration succeeds, if you want to add the constraint:

1. **Check what payment methods you have:**

   ```sql
   -- Run in Supabase SQL Editor
   SELECT DISTINCT payment_method, COUNT(*) as count
   FROM sales 
   GROUP BY payment_method
   ORDER BY count DESC;
   ```

2. **Standardize them** (example - adjust to your values):

   ```sql
   -- Update any Spanish variations
   UPDATE sales SET payment_method = 'card' 
   WHERE payment_method IN ('tarjeta', 'credito', 'debito');
   
   UPDATE sales SET payment_method = 'cash' 
   WHERE payment_method IN ('efectivo', 'contado');
   
   UPDATE sales SET payment_method = 'transfer' 
   WHERE payment_method IN ('transferencia', 'banco');
   ```

3. **Add the constraint:**

   ```sql
   ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check
     CHECK (payment_method IN ('cash', 'card', 'transfer', 'mixed', 'voucher'));
   ```

## Other Potential Issues

### Before Running Migration Again

Run this pre-check script to identify any other issues:

```powershell
# Copy the contents of scripts/pre_migration_check.sql
# Paste into Supabase SQL Editor and run
```

This will check for:
- ✓ NULL user_id values in clients
- ✓ Invalid JSONB sizes in inventory  
- ✓ Negative stock values
- ✓ Payment method variations

### If You See: "clients.user_id violates not null constraint"

**Fix:**

```sql
-- Find clients with NULL user_id
SELECT id, name, phone FROM clients WHERE user_id IS NULL;

-- Option 1: Assign to your user
UPDATE clients 
SET user_id = 'YOUR-USER-ID-HERE' 
WHERE user_id IS NULL;

-- Option 2: Delete orphan records (be careful!)
DELETE FROM clients WHERE user_id IS NULL;
```

Then re-run the migration.

## What's Next

Once `npx supabase db push` succeeds:

1. ✅ Both migrations will be applied
2. ✅ Initialize inventory movements:
   ```sql
   SELECT initialize_inventory_movements();
   ```
3. ✅ Run test script to verify everything works
4. ✅ Update your application code (see MIGRATION_GUIDE.md)

## Summary of Changes Made

I've updated the migration to:
- ✅ Skip the payment_method constraint (was causing the error)
- ✅ Show what payment methods exist in your database
- ✅ Check for NULL user_id values and give clear error if found
- ✅ Provide helpful notices during migration

**The migration should now work!** Try running `npx supabase db push` again.

## Need More Help?

1. Check `docs/MIGRATION_GUIDE.md` for detailed instructions
2. Run `scripts/pre_migration_check.sql` to identify data issues
3. Check the Supabase Dashboard → Logs → Database for detailed error messages
