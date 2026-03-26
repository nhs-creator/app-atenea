-- =============================================================================
-- RPC: save_multi_sale - Transacción atómica para guardar ventas multi-item
-- =============================================================================
-- Toda la lógica de saveMultiSale se ejecuta dentro de una sola transacción.
-- Si cualquier paso falla, todo se revierte automáticamente.

CREATE OR REPLACE FUNCTION public.save_multi_sale(
  p_date date,
  p_items jsonb,
  p_payments jsonb,
  p_client_id uuid DEFAULT NULL,
  p_client_draft jsonb DEFAULT NULL,
  p_is_edit boolean DEFAULT false,
  p_original_client_number text DEFAULT NULL,
  p_force_completed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_final_client_id uuid := p_client_id;
  v_cart_total numeric := 0;
  v_total_paid numeric := 0;
  v_rounding_diff numeric;
  v_is_pending boolean;
  v_semantic_id text;
  v_voucher_code text;
  v_voucher_amount numeric;
  v_generated_voucher jsonb := null;
  v_item jsonb;
  v_payment jsonb;
  v_existing_numbers text[];
  v_unique_count int;
  v_prefix text;
  v_date_part text;
  v_expires_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ==========================================================================
  -- 1. Crear cliente si es nuevo
  -- ==========================================================================
  IF p_client_draft IS NOT NULL AND v_final_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, last_name, phone, email)
    VALUES (
      v_user_id,
      UPPER(p_client_draft->>'name'),
      UPPER(p_client_draft->>'lastName'),
      p_client_draft->>'phone',
      LOWER(NULLIF(p_client_draft->>'email', ''))
    )
    RETURNING id INTO v_final_client_id;
  END IF;

  -- ==========================================================================
  -- 2. Calcular totales
  -- ==========================================================================
  SELECT COALESCE(SUM((item->>'finalPrice')::numeric * (item->>'quantity')::int), 0)
  INTO v_cart_total
  FROM jsonb_array_elements(p_items) AS item;

  SELECT COALESCE(SUM((pay->>'amount')::numeric), 0)
  INTO v_total_paid
  FROM jsonb_array_elements(p_payments) AS pay;

  v_rounding_diff := v_total_paid - v_cart_total;

  v_is_pending := (v_total_paid < (v_cart_total + v_rounding_diff)) AND NOT p_force_completed;

  -- ==========================================================================
  -- 3. Generar vale si saldo es negativo
  -- ==========================================================================
  IF v_total_paid < 0 OR (v_cart_total + v_rounding_diff) < 0 THEN
    v_voucher_code := 'VALE-' || REPLACE(SUBSTRING(p_date::text, 3), '-', '') || '-' ||
                      UPPER(SUBSTRING(md5(random()::text), 1, 3));
    v_voucher_amount := ABS(v_total_paid);
    v_expires_at := NOW() + INTERVAL '90 days';

    INSERT INTO public.vouchers (user_id, code, initial_amount, current_amount, status, expires_at)
    VALUES (v_user_id, v_voucher_code, v_voucher_amount, v_voucher_amount, 'active', v_expires_at);

    v_generated_voucher := jsonb_build_object(
      'code', v_voucher_code,
      'amount', v_voucher_amount,
      'expires_at', v_expires_at
    );
  END IF;

  -- ==========================================================================
  -- 4. Marcar vales usados
  -- ==========================================================================
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    IF v_payment->>'method' = 'Vale' AND v_payment->>'voucherCode' IS NOT NULL THEN
      UPDATE public.vouchers
      SET status = 'used', current_amount = 0
      WHERE code = v_payment->>'voucherCode'
        AND user_id = v_user_id;
    END IF;
  END LOOP;

  -- ==========================================================================
  -- 5. Generar ID semántico
  -- ==========================================================================
  IF p_is_edit THEN
    v_semantic_id := p_original_client_number;
  ELSE
    -- Obtener client_numbers existentes para la fecha
    SELECT ARRAY_AGG(DISTINCT client_number)
    INTO v_existing_numbers
    FROM public.sales
    WHERE date = p_date AND user_id = v_user_id;

    v_unique_count := COALESCE(array_length(v_existing_numbers, 1), 0);

    -- Determinar prefijo
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) AS item WHERE (item->>'isReturn')::boolean = true) THEN
      v_prefix := 'C';
    ELSIF v_is_pending THEN
      v_prefix := 'S';
    ELSE
      v_prefix := 'V';
    END IF;

    v_date_part := REPLACE(SUBSTRING(p_date::text, 3), '-', '');
    v_semantic_id := v_prefix || v_date_part || '-' || LPAD((v_unique_count + 1)::text, 3, '0');
  END IF;

  -- ==========================================================================
  -- 6. Si es edición, eliminar ventas anteriores (DENTRO de la transacción)
  -- ==========================================================================
  IF p_is_edit THEN
    -- Primero cancelar para que los triggers restauren stock
    UPDATE public.sales
    SET status = 'cancelled'
    WHERE client_number = p_original_client_number
      AND user_id = v_user_id;

    DELETE FROM public.sales
    WHERE client_number = p_original_client_number
      AND user_id = v_user_id;
  END IF;

  -- ==========================================================================
  -- 7. Insertar items de venta
  -- ==========================================================================
  INSERT INTO public.sales (
    date, client_number, product_name, quantity, price, list_price, cost_price,
    payment_method, payment_details, status, expires_at, size,
    inventory_id, client_id, user_id
  )
  SELECT
    p_date,
    v_semantic_id,
    CASE WHEN (item->>'isReturn')::boolean = true
      THEN '(DEVOLUCIÓN) ' || (item->>'product')
      ELSE item->>'product'
    END,
    (item->>'quantity')::int,
    (item->>'finalPrice')::numeric,
    (item->>'listPrice')::numeric,
    (item->>'cost_price')::numeric,
    COALESCE(p_payments->0->>'method', 'Efectivo'),
    p_payments,
    CASE WHEN v_is_pending THEN 'pending' ELSE 'completed' END,
    CASE WHEN v_is_pending THEN NOW() + INTERVAL '90 days' ELSE NULL END,
    item->>'size',
    NULLIF(item->>'inventory_id', '')::uuid,
    v_final_client_id,
    v_user_id
  FROM jsonb_array_elements(p_items) AS item;

  -- Insertar ajuste por redondeo si corresponde
  IF ABS(v_rounding_diff) > 0 AND ABS(v_rounding_diff) < 1000 THEN
    INSERT INTO public.sales (
      date, client_number, product_name, quantity, price, list_price, cost_price,
      payment_method, payment_details, status, expires_at, size,
      inventory_id, client_id, user_id
    ) VALUES (
      p_date, v_semantic_id, '💰 AJUSTE POR REDONDEO', 1,
      v_rounding_diff, 0, 0,
      COALESCE(p_payments->0->>'method', 'Efectivo'), p_payments,
      CASE WHEN v_is_pending THEN 'pending' ELSE 'completed' END,
      CASE WHEN v_is_pending THEN NOW() + INTERVAL '90 days' ELSE NULL END,
      'U', NULL, v_final_client_id, v_user_id
    );
  END IF;

  -- 8. Stock se actualiza AUTOMÁTICAMENTE via trigger handle_sale_stock_change

  RETURN jsonb_build_object(
    'success', true,
    'client_number', v_semantic_id,
    'voucher', v_generated_voucher
  );
END;
$$;

-- Permisos: solo usuarios autenticados pueden ejecutar
REVOKE ALL ON FUNCTION public.save_multi_sale FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_multi_sale FROM anon;
GRANT EXECUTE ON FUNCTION public.save_multi_sale TO authenticated;
