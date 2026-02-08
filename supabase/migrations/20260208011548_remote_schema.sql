


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_stock_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Suma todos los valores del JSONB transformándolos a enteros
  SELECT COALESCE(SUM(value::int), 0)
  INTO NEW.stock_total
  FROM jsonb_each_text(NEW.sizes);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_stock_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text",
    "total_spent" numeric DEFAULT 0,
    "last_purchase_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "category" "text" NOT NULL,
    "has_invoice_a" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "invoice_amount" numeric(12,2) DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'business'::"text" NOT NULL,
    CONSTRAINT "expenses_type_check" CHECK (("type" = ANY (ARRAY['business'::"text", 'personal'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "subcategory" "text",
    "material" "text",
    "cost_price" numeric(12,2) DEFAULT 0,
    "selling_price" numeric(12,2) DEFAULT 0,
    "sizes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "stock_total" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_categories" (
    "id" "text" NOT NULL,
    "label" "text" NOT NULL
);


ALTER TABLE "public"."inventory_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_materials" (
    "id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "normalized_key" "text" NOT NULL
);


ALTER TABLE "public"."inventory_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_subcategories" (
    "id" "text" NOT NULL,
    "category_id" "text" NOT NULL,
    "label" "text" NOT NULL
);


ALTER TABLE "public"."inventory_subcategories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "store_name" "text" DEFAULT 'Mi Local de Ropa'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'owner'::"text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'accountant'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "inventory_id" "uuid",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "client_number" "text" NOT NULL,
    "product_name" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "size" "text",
    "price" numeric(12,2) NOT NULL,
    "cost_price" numeric(12,2),
    "payment_method" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'completed'::"text",
    "list_price" numeric(12,2),
    "expires_at" "date",
    "payment_details" "jsonb" DEFAULT '[]'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "customer_id" "uuid",
    CONSTRAINT "sales_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'pending'::"text", 'cancelled'::"text", 'returned'::"text", 'exchanged'::"text"])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sales"."payment_details" IS 'Guarda el desglose de múltiples medios de pago, incluyendo descuentos por ítem y ajustes de redondeo.';



CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "code" "text" NOT NULL,
    "initial_amount" numeric(12,2) NOT NULL,
    "current_amount" numeric(12,2) NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '3 mons'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "vouchers_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'used'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


COMMENT ON TABLE "public"."vouchers" IS 'Tabla para gestionar notas de crédito y saldos a favor de clientes.';



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_materials"
    ADD CONSTRAINT "inventory_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_subcategories"
    ADD CONSTRAINT "inventory_subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "unique_voucher_code_per_user" UNIQUE ("user_id", "code");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_customers_phone" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "idx_customers_user_id" ON "public"."customers" USING "btree" ("user_id");



CREATE INDEX "idx_expenses_category" ON "public"."expenses" USING "btree" ("category");



CREATE INDEX "idx_expenses_date" ON "public"."expenses" USING "btree" ("date");



CREATE INDEX "idx_expenses_type" ON "public"."expenses" USING "btree" ("type");



CREATE INDEX "idx_sales_client_number" ON "public"."sales" USING "btree" ("client_number");



CREATE INDEX "idx_sales_expires_at" ON "public"."sales" USING "btree" ("expires_at");



CREATE INDEX "idx_sales_status" ON "public"."sales" USING "btree" ("status");



CREATE INDEX "idx_vouchers_code" ON "public"."vouchers" USING "btree" ("code");



CREATE OR REPLACE TRIGGER "trg_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inventory_stock_sync" BEFORE INSERT OR UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_stock_total"();



CREATE OR REPLACE TRIGGER "trg_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_subcategories"
    ADD CONSTRAINT "inventory_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow read inventory_categories" ON "public"."inventory_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read inventory_materials" ON "public"."inventory_materials" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read inventory_subcategories" ON "public"."inventory_subcategories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "RLS_Expenses_Accountant_Read_Only" ON "public"."expenses" FOR SELECT TO "authenticated" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'accountant'::"text") AND ("category" <> 'Personal'::"text")));



CREATE POLICY "RLS_Expenses_Owner_Full_Access" ON "public"."expenses" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'owner'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'owner'::"text"));



CREATE POLICY "RLS_Inventory" ON "public"."inventory" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "RLS_Profiles" ON "public"."profiles" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "RLS_Sales_Accountant_Read_Only" ON "public"."sales" FOR SELECT TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'accountant'::"text"));



CREATE POLICY "RLS_Sales_Owner_Full_Access" ON "public"."sales" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'owner'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'owner'::"text"));



CREATE POLICY "RLS_Vouchers" ON "public"."vouchers" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own customers" ON "public"."customers" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_subcategories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_stock_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_stock_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_stock_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_categories" TO "anon";
GRANT ALL ON TABLE "public"."inventory_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_categories" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_materials" TO "anon";
GRANT ALL ON TABLE "public"."inventory_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_materials" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_subcategories" TO "anon";
GRANT ALL ON TABLE "public"."inventory_subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_subcategories" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


