-- =============================================================================
-- SEED: 3-Level Inventory Categorization System
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- 1. Create reference tables (if not exist)
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id text PRIMARY KEY,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_subcategories (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES public.inventory_categories(id) ON DELETE CASCADE,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_materials (
  id text PRIMARY KEY,
  label text NOT NULL,
  normalized_key text NOT NULL
);

-- Enable RLS
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_materials ENABLE ROW LEVEL SECURITY;

-- Policies: allow all authenticated users to read (drop first for idempotency)
DROP POLICY IF EXISTS "Allow read inventory_categories" ON public.inventory_categories;
CREATE POLICY "Allow read inventory_categories" ON public.inventory_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow read inventory_subcategories" ON public.inventory_subcategories;
CREATE POLICY "Allow read inventory_subcategories" ON public.inventory_subcategories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow read inventory_materials" ON public.inventory_materials;
CREATE POLICY "Allow read inventory_materials" ON public.inventory_materials FOR SELECT TO authenticated USING (true);

-- 2. Clear existing data (for clean re-seed; comment out to append)
TRUNCATE public.inventory_categories CASCADE;
TRUNCATE public.inventory_materials;

-- 3. Seed CATEGORIES (Level 1)
INSERT INTO public.inventory_categories (id, label) VALUES
  ('tejidos_y_abrigos', 'Tejidos y Abrigos'),
  ('prendas_superiores', 'Prendas Superiores'),
  ('prendas_inferiores', 'Prendas Inferiores'),
  ('piezas_enteras', 'Piezas Enteras'),
  ('accesorios', 'Accesorios'),
  ('marroquinería', 'Marroquinería'),
  ('bijouterie', 'Bijouterie'),
  ('hogar_home', 'Hogar/Home'),
  ('otros', 'Otros')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- 4. Seed SUBCATEGORIES (Level 2)
INSERT INTO public.inventory_subcategories (id, category_id, label) VALUES
  ('sueter', 'tejidos_y_abrigos', 'Sueter'),
  ('poleron', 'tejidos_y_abrigos', 'Poleron'),
  ('chaleco', 'tejidos_y_abrigos', 'Chaleco'),
  ('saco', 'tejidos_y_abrigos', 'Saco'),
  ('buzo', 'tejidos_y_abrigos', 'Buzo'),
  ('campera', 'tejidos_y_abrigos', 'Campera'),
  ('ruana', 'tejidos_y_abrigos', 'Ruana'),
  ('poncho', 'tejidos_y_abrigos', 'Poncho'),
  ('cardigan', 'tejidos_y_abrigos', 'Cardigan'),
  ('remera', 'prendas_superiores', 'Remera'),
  ('musculosa', 'prendas_superiores', 'Musculosa'),
  ('blusa', 'prendas_superiores', 'Blusa'),
  ('camisa', 'prendas_superiores', 'Camisa'),
  ('polera', 'prendas_superiores', 'Polera'),
  ('body', 'prendas_superiores', 'Body'),
  ('top', 'prendas_superiores', 'Top'),
  ('jean', 'prendas_inferiores', 'Jean'),
  ('pantalon', 'prendas_inferiores', 'Pantalón'),
  ('palazo', 'prendas_inferiores', 'Palazo'),
  ('babucha', 'prendas_inferiores', 'Babucha'),
  ('short', 'prendas_inferiores', 'Short'),
  ('jogger', 'prendas_inferiores', 'Jogger'),
  ('pollera', 'prendas_inferiores', 'Pollera'),
  ('vestido', 'piezas_enteras', 'Vestido'),
  ('mono', 'piezas_enteras', 'Mono'),
  ('pañuelo', 'accesorios', 'Pañuelo'),
  ('gorra', 'accesorios', 'Gorra'),
  ('gorro', 'accesorios', 'Gorro'),
  ('boina', 'accesorios', 'Boina'),
  ('vincha', 'accesorios', 'Vincha'),
  ('bufanda', 'accesorios', 'Bufanda'),
  ('chalina', 'accesorios', 'Chalina'),
  ('pashmina', 'accesorios', 'Pashmina'),
  ('guante', 'accesorios', 'Guante'),
  ('miton', 'accesorios', 'Mitón'),
  ('cinto', 'accesorios', 'Cinto'),
  ('bolso', 'marroquinería', 'Bolso'),
  ('mochila', 'marroquinería', 'Mochila'),
  ('cartera', 'marroquinería', 'Cartera'),
  ('bandolera', 'marroquinería', 'Bandolera'),
  ('riñonera', 'marroquinería', 'Riñonera'),
  ('billetera', 'marroquinería', 'Billetera'),
  ('portacosmeticos', 'marroquinería', 'Portacosméticos'),
  ('aros', 'bijouterie', 'Aros'),
  ('collares', 'bijouterie', 'Collares'),
  ('pulseras', 'bijouterie', 'Pulseras'),
  ('chokers', 'bijouterie', 'Chokers'),
  ('broches', 'bijouterie', 'Broches'),
  ('llaveros', 'bijouterie', 'Llaveros'),
  ('difusor', 'hogar_home', 'Difusor'),
  ('vela', 'hogar_home', 'Vela'),
  ('textil', 'hogar_home', 'Textil'),
  ('cambios', 'otros', 'Cambios'),
  ('señas_restos', 'otros', 'Señas/Restos'),
  ('varios', 'otros', 'Varios')
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, label = EXCLUDED.label;

-- 5. Seed MATERIALS (Level 3)
INSERT INTO public.inventory_materials (id, label, normalized_key) VALUES
  ('algodon', 'Algodón', 'algodon'),
  ('bambula', 'Bambula', 'bambula'),
  ('batista', 'Batista', 'batista'),
  ('bengalina', 'Bengalina', 'bengalina'),
  ('bremer', 'Bremer', 'bremer'),
  ('broderi', 'Broderi', 'broderi'),
  ('chenille', 'Chenille', 'chenille'),
  ('crepe', 'Crepé', 'crepe'),
  ('ecocuero', 'Ecocuero', 'ecocuero'),
  ('engomado', 'Engomado', 'engomado'),
  ('gabardina', 'Gabardina', 'gabardina'),
  ('hilo', 'Hilo', 'hilo'),
  ('jean', 'Jean', 'jean'),
  ('lana', 'Lana', 'lana'),
  ('lanilla', 'Lanilla', 'lanilla'),
  ('lino', 'Lino', 'lino'),
  ('micropolar', 'Micropolar', 'micropolar'),
  ('modal', 'Modal', 'modal'),
  ('morley', 'Morley', 'morley'),
  ('poplin', 'Poplín', 'poplin'),
  ('saten', 'Satén', 'saten'),
  ('simil_lino', 'Símil Lino', 'simil_lino'),
  ('tela', 'Tela', 'tela'),
  ('tuill', 'Tuill', 'tuill'),
  ('yute', 'Yute', 'yute')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, normalized_key = EXCLUDED.normalized_key;
