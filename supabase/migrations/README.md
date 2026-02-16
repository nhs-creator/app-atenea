# Database Migrations

This folder contains SQL migration files for the Atenea Finanzas database.

## Migration Files

### `20260216151839_remote_schema.sql`
- **Status**: ✅ Already applied (current production schema)
- **Description**: Base schema with sales, inventory, expenses, clients, vouchers, profiles
- **Do NOT re-run**: This is your current state

### `20260216155000_critical_security_fixes.sql`
- **Status**: ⏳ Ready to apply
- **Priority**: CRITICAL
- **Description**: Fixes cross-tenant RLS data leaks and adds performance indexes
- **Apply First**: This must be applied before the inventory improvements
- **Changes**:
  - Fixes RLS policies to prevent owner/accountant data leaks
  - Revokes anon access from all tables
  - Adds 15+ missing indexes for performance
  - Creates `accountant_assignments` table
  - Adds missing NOT NULL constraints
  - Syncs client stats automatically

### `20260216160000_inventory_system_improvements.sql`
- **Status**: ⏳ Ready to apply
- **Priority**: HIGH
- **Description**: Complete inventory management system with audit trail
- **Apply Second**: Requires security fixes migration first
- **Changes**:
  - Adds SKU and barcode columns
  - Creates `inventory_movements` audit trail table
  - Creates `inventory_price_history` tracking
  - Automatic stock deduction on sale
  - Automatic stock restoration on return/cancel
  - Low-stock alert view
  - Reconciliation function
  - Manual adjustment function

## How to Apply

### Quick Method (Recommended)

```powershell
# From project root
npx supabase db push
```

This automatically applies migrations in order.

### Manual Method

1. Open Supabase Dashboard → SQL Editor
2. Copy/paste `20260216155000_critical_security_fixes.sql` → Run
3. Copy/paste `20260216160000_inventory_system_improvements.sql` → Run
4. Run: `SELECT initialize_inventory_movements();`

## Important Notes

⚠️ **BACKUP FIRST**: Always backup your database before applying migrations

⚠️ **TEST IN STAGING**: Apply to a staging environment first

⚠️ **ORDER MATTERS**: Apply security fixes before inventory improvements

⚠️ **BREAKING CHANGES**: These migrations include breaking RLS changes:
- Owners can now only see their own data (cross-tenant access blocked)
- Accountants need explicit assignment to owners
- Stock deduction is now automatic (remove manual code)

## Post-Migration

After applying both migrations:

1. Run initialization:
   ```sql
   SELECT initialize_inventory_movements();
   ```

2. Test with verification script:
   ```powershell
   # Run scripts/test_inventory_system.sql in SQL Editor
   ```

3. Update your application code:
   - Remove manual stock deduction
   - Add SKU/barcode fields to forms
   - Update `last_updated` → `updated_at`
   - Add error handling for insufficient stock

## Documentation

- **Full Audit Report**: `docs/SCHEMA_AUDIT_REPORT.md`
- **Migration Guide**: `docs/MIGRATION_GUIDE.md`
- **Implementation Summary**: `docs/IMPLEMENTATION_SUMMARY.md`
- **Function Examples**: `scripts/inventory_functions_examples.sql`
- **Test Script**: `scripts/test_inventory_system.sql`

## Rollback

If needed, restore from backup. See `docs/MIGRATION_GUIDE.md` → Rollback Plan.

## Support

For issues:
1. Check Supabase Dashboard → Logs → Database
2. Review error messages in migration output
3. See troubleshooting section in `docs/MIGRATION_GUIDE.md`
