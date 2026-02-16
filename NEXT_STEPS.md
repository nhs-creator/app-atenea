# 🎯 NEXT STEPS - Start Here!

Your migrations are complete! Follow these steps in order:

---

## Step 1: Initialize Inventory Movements (REQUIRED)

1. Go to your **Supabase Dashboard**
2. Click **SQL Editor** in the sidebar
3. Paste this SQL and click **RUN**:

```sql
SELECT public.initialize_inventory_movements();
```

✅ You should see a number returned (e.g., `150`) — that's how many movement records were created.

---

## Step 2: Verify Everything Works

In the same SQL Editor, paste and run the contents of:

📄 **`scripts/post_migration_tests.sql`**

This runs 8 quick tests to verify:
- Movement records were created
- New tables exist
- New functions work
- Triggers are active
- Your data looks good

---

## Step 3: Test Stock Deduction (Optional but Recommended)

### Quick Test in SQL Editor:

```sql
-- 1. Pick an inventory item
SELECT id, name, sizes FROM inventory LIMIT 1;
-- Copy an inventory ID

-- 2. Create a test sale (replace the UUIDs with yours)
INSERT INTO sales (
  user_id,
  inventory_id,  -- paste the inventory ID here
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
  'M',  -- adjust to a size that exists
  1,
  100.00,
  'Efectivo',
  'completed',  -- This triggers stock deduction!
  '999'
) RETURNING id;

-- 3. Check that stock was deducted
SELECT name, sizes FROM inventory 
WHERE id = 'YOUR-INVENTORY-ID-HERE'::uuid;

-- 4. Check movement was recorded
SELECT * FROM inventory_movements 
WHERE reference_type = 'sale'
ORDER BY created_at DESC 
LIMIT 1;

-- 5. Clean up - delete the test sale (stock will auto-restore!)
DELETE FROM sales WHERE client_number = '999';
```

---

## Step 4: Update Your Application Code

### Changes Required:

#### 1. Remove Manual Stock Deduction

Find where you update `inventory.sizes` manually and **remove that code**. The database now handles it automatically.

#### 2. Update Column Name

Search for `last_updated` and replace with `updated_at`:

```typescript
// OLD
inventory.last_updated

// NEW  
inventory.updated_at
```

#### 3. Add Error Handling

When creating sales, handle insufficient stock errors:

```typescript
const { data, error } = await supabase
  .from('sales')
  .insert(saleData);

if (error?.message.includes('Insufficient stock')) {
  alert('No hay suficiente stock disponible');
}
```

---

## Step 5: Optional Enhancements

Consider adding these features to your UI:

### 📊 Low Stock Dashboard
```typescript
const { data } = await supabase
  .from('low_stock_items')
  .select('*');
```

### 📝 Movement History
```typescript
const { data } = await supabase
  .from('inventory_movements')
  .select('*')
  .eq('inventory_id', itemId)
  .order('created_at', { ascending: false });
```

### 🏷️ SKU/Barcode Fields
Add to your inventory form:
```tsx
<input name="sku" placeholder="SKU-001" />
<input name="barcode" placeholder="1234567890" />
```

---

## 📚 Documentation

| File | When to Use |
|------|-------------|
| `docs/MIGRATION_SUCCESS.md` | Overview of what changed |
| `docs/IMPLEMENTATION_SUMMARY.md` | Code changes needed |
| `scripts/inventory_functions_examples.sql` | How to use new features |
| `docs/SCHEMA_AUDIT_REPORT.md` | Full technical details |

---

## ✅ Done Checklist

- [ ] Ran `SELECT initialize_inventory_movements();`
- [ ] Ran `post_migration_tests.sql`
- [ ] Tested stock deduction (optional)
- [ ] Updated code to use `updated_at`
- [ ] Removed manual stock deduction code
- [ ] Added error handling for insufficient stock
- [ ] Tested creating a sale in the app
- [ ] Tested returning a sale in the app

---

## 🎉 That's It!

Your inventory system is now production-ready with:
- ✅ Automatic stock management
- ✅ Complete audit trail
- ✅ Security fixes applied
- ✅ Performance optimized

**Start with Step 1 above** (initialize movements in SQL Editor), then move through the checklist!

---

## Need Help?

- **Payment methods**: Your Spanish payment methods (Efectivo, Débito, Crédito, Transferencia) are working fine!
- **Errors**: See `docs/MIGRATION_TROUBLESHOOTING.md`
- **Examples**: See `scripts/inventory_functions_examples.sql`
- **Code changes**: See `docs/IMPLEMENTATION_SUMMARY.md`
