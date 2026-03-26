-- ============================================================================
-- TRIGGER: Record inventory_movements when inventory.sizes is updated manually
-- ============================================================================
-- When a user edits product stock from the UI (InventoryView form), the
-- update goes directly to inventory.sizes. This trigger captures those
-- changes and records them in inventory_movements so they appear in the
-- history modal.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_inventory_sizes_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_size text;
  v_old_qty integer;
  v_new_qty integer;
  v_change integer;
  v_user_id uuid;
BEGIN
  -- Only process if sizes actually changed
  IF OLD.sizes IS NOT DISTINCT FROM NEW.sizes THEN
    RETURN NEW;
  END IF;

  v_user_id := COALESCE(auth.uid(), NEW.user_id);

  -- Loop through all keys that exist in either OLD or NEW
  FOR v_size IN
    SELECT DISTINCT key
    FROM (
      SELECT jsonb_object_keys(COALESCE(OLD.sizes, '{}'::jsonb)) AS key
      UNION
      SELECT jsonb_object_keys(COALESCE(NEW.sizes, '{}'::jsonb)) AS key
    ) keys
  LOOP
    v_old_qty := COALESCE((OLD.sizes ->> v_size)::int, 0);
    v_new_qty := COALESCE((NEW.sizes ->> v_size)::int, 0);
    v_change := v_new_qty - v_old_qty;

    -- Only record if there was an actual change
    IF v_change <> 0 THEN
      INSERT INTO public.inventory_movements
        (inventory_id, user_id, movement_type, size, quantity_change,
         quantity_before, quantity_after, reference_type, notes)
      VALUES
        (NEW.id, v_user_id, 'adjustment', v_size, v_change,
         v_old_qty, v_new_qty, 'manual',
         'Edición manual: ' || COALESCE(NEW.name, 'Producto') || ' talle ' || v_size);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_inventory_sizes_change() IS 'Records inventory_movements when inventory.sizes is updated (manual edits from UI)';

DROP TRIGGER IF EXISTS trg_inventory_sizes_change ON public.inventory;
CREATE TRIGGER trg_inventory_sizes_change
  AFTER UPDATE ON public.inventory
  FOR EACH ROW
  WHEN (
    OLD.sizes IS DISTINCT FROM NEW.sizes
  )
  EXECUTE FUNCTION public.handle_inventory_sizes_change();
