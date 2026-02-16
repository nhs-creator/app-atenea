# Database Scripts

Helper scripts for database management and migrations.

## Pre-Migration

### `pre_migration_check.sql`
**Run this BEFORE applying migrations** to identify potential data issues.

Checks for:
- NULL user_id in clients
- Invalid payment methods
- Invalid JSONB sizes
- Negative stock values

**How to use:**
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste the contents of this file
3. Run it
4. Fix any warnings before migrating

### `check_payment_methods.sql`
Quick query to see all payment methods in your database.

---

## Post-Migration

### `test_inventory_system.sql`
**Run this AFTER migrations** to verify everything was applied correctly.

Checks:
- All tables created
- All functions exist
- All triggers created
- All indexes created
- RLS policies configured

**How to use:**
1. After running `npx supabase db push`
2. Open Supabase SQL Editor
3. Copy/paste this file and run
4. Look for ✓ (success) or ✗ (failure) markers

### `inventory_functions_examples.sql`
Complete examples of how to use all new inventory functions.

Includes:
- Adjusting stock manually
- Viewing movement history
- Reconciling inventory
- Checking low stock
- Managing price history
- Accountant assignments

**How to use:**
- Reference guide for using new features
- Copy/paste specific examples as needed
- Adapt to your application

---

## Quick Reference

### Before Migration
```powershell
# 1. Run pre-check
# Copy pre_migration_check.sql → Supabase SQL Editor → Run

# 2. Fix any issues found

# 3. Apply migrations
npx supabase db push
```

### After Migration
```powershell
# 1. Initialize movements
# Run in SQL Editor: SELECT initialize_inventory_movements();

# 2. Verify installation
# Copy test_inventory_system.sql → Supabase SQL Editor → Run

# 3. Learn new features
# Read inventory_functions_examples.sql
```

---

## Troubleshooting

If migrations fail, see:
- `docs/MIGRATION_TROUBLESHOOTING.md` — Common errors and fixes
- `docs/MIGRATION_GUIDE.md` — Complete migration guide
