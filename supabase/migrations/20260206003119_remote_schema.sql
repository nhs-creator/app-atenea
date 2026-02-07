drop policy "RLS_Expenses" on "public"."expenses";

drop policy "RLS_Sales" on "public"."sales";

alter table "public"."sales" drop constraint "sales_status_check";

alter table "public"."expenses" drop column "invoice_percentage";

alter table "public"."expenses" add column "invoice_amount" numeric(12,2) default 0;

alter table "public"."expenses" add column "updated_at" timestamp with time zone default now();

alter table "public"."profiles" add column "role" text default 'owner'::text;

alter table "public"."sales" add column "updated_at" timestamp with time zone default now();

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);

CREATE INDEX idx_expenses_date ON public.expenses USING btree (date);

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'accountant'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."sales" add constraint "sales_status_check" CHECK ((status = ANY (ARRAY['completed'::text, 'pending'::text, 'cancelled'::text, 'returned'::text, 'exchanged'::text]))) not valid;

alter table "public"."sales" validate constraint "sales_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;


  create policy "RLS_Expenses_Roles"
  on "public"."expenses"
  as permissive
  for select
  to authenticated
using (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'owner'::text) OR ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'accountant'::text) AND (category <> 'Personal'::text))));



  create policy "RLS_Sales_Accountant_Read_Only"
  on "public"."sales"
  as permissive
  for select
  to authenticated
using ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'accountant'::text));



  create policy "RLS_Sales_Owner_Full_Access"
  on "public"."sales"
  as permissive
  for all
  to authenticated
using ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'owner'::text))
with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'owner'::text));


CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


