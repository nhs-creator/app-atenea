drop extension if exists "pg_net";


  create table "public"."expenses" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null default auth.uid(),
    "date" date not null default CURRENT_DATE,
    "description" text not null,
    "amount" numeric(12,2) not null,
    "category" text not null,
    "has_invoice_a" boolean default false,
    "invoice_percentage" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."expenses" enable row level security;


  create table "public"."inventory" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null default auth.uid(),
    "name" text not null,
    "category" text not null,
    "subcategory" text,
    "material" text,
    "cost_price" numeric(12,2) default 0,
    "selling_price" numeric(12,2) default 0,
    "sizes" jsonb not null default '{}'::jsonb,
    "stock_total" integer default 0,
    "last_updated" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."inventory" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "store_name" text default 'Mi Local de Ropa'::text,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."sales" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null default auth.uid(),
    "inventory_id" uuid,
    "date" date not null default CURRENT_DATE,
    "client_number" text,
    "product_name" text not null,
    "quantity" integer not null default 1,
    "size" text,
    "price" numeric(12,2) not null,
    "cost_price" numeric(12,2),
    "payment_method" text not null,
    "notes" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."sales" enable row level security;

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

CREATE UNIQUE INDEX inventory_pkey ON public.inventory USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX sales_pkey ON public.sales USING btree (id);

alter table "public"."expenses" add constraint "expenses_pkey" PRIMARY KEY using index "expenses_pkey";

alter table "public"."inventory" add constraint "inventory_pkey" PRIMARY KEY using index "inventory_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."sales" add constraint "sales_pkey" PRIMARY KEY using index "sales_pkey";

alter table "public"."expenses" add constraint "expenses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."expenses" validate constraint "expenses_user_id_fkey";

alter table "public"."inventory" add constraint "inventory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."inventory" validate constraint "inventory_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."sales" add constraint "sales_inventory_id_fkey" FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE SET NULL not valid;

alter table "public"."sales" validate constraint "sales_inventory_id_fkey";

alter table "public"."sales" add constraint "sales_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."sales" validate constraint "sales_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_stock_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Suma todos los valores del JSONB transformándolos a enteros
  SELECT COALESCE(SUM(value::int), 0)
  INTO NEW.stock_total
  FROM jsonb_each_text(NEW.sizes);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  RETURN new;
END;
$function$
;

grant delete on table "public"."expenses" to "anon";

grant insert on table "public"."expenses" to "anon";

grant references on table "public"."expenses" to "anon";

grant select on table "public"."expenses" to "anon";

grant trigger on table "public"."expenses" to "anon";

grant truncate on table "public"."expenses" to "anon";

grant update on table "public"."expenses" to "anon";

grant delete on table "public"."expenses" to "authenticated";

grant insert on table "public"."expenses" to "authenticated";

grant references on table "public"."expenses" to "authenticated";

grant select on table "public"."expenses" to "authenticated";

grant trigger on table "public"."expenses" to "authenticated";

grant truncate on table "public"."expenses" to "authenticated";

grant update on table "public"."expenses" to "authenticated";

grant delete on table "public"."expenses" to "service_role";

grant insert on table "public"."expenses" to "service_role";

grant references on table "public"."expenses" to "service_role";

grant select on table "public"."expenses" to "service_role";

grant trigger on table "public"."expenses" to "service_role";

grant truncate on table "public"."expenses" to "service_role";

grant update on table "public"."expenses" to "service_role";

grant delete on table "public"."inventory" to "anon";

grant insert on table "public"."inventory" to "anon";

grant references on table "public"."inventory" to "anon";

grant select on table "public"."inventory" to "anon";

grant trigger on table "public"."inventory" to "anon";

grant truncate on table "public"."inventory" to "anon";

grant update on table "public"."inventory" to "anon";

grant delete on table "public"."inventory" to "authenticated";

grant insert on table "public"."inventory" to "authenticated";

grant references on table "public"."inventory" to "authenticated";

grant select on table "public"."inventory" to "authenticated";

grant trigger on table "public"."inventory" to "authenticated";

grant truncate on table "public"."inventory" to "authenticated";

grant update on table "public"."inventory" to "authenticated";

grant delete on table "public"."inventory" to "service_role";

grant insert on table "public"."inventory" to "service_role";

grant references on table "public"."inventory" to "service_role";

grant select on table "public"."inventory" to "service_role";

grant trigger on table "public"."inventory" to "service_role";

grant truncate on table "public"."inventory" to "service_role";

grant update on table "public"."inventory" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."sales" to "anon";

grant insert on table "public"."sales" to "anon";

grant references on table "public"."sales" to "anon";

grant select on table "public"."sales" to "anon";

grant trigger on table "public"."sales" to "anon";

grant truncate on table "public"."sales" to "anon";

grant update on table "public"."sales" to "anon";

grant delete on table "public"."sales" to "authenticated";

grant insert on table "public"."sales" to "authenticated";

grant references on table "public"."sales" to "authenticated";

grant select on table "public"."sales" to "authenticated";

grant trigger on table "public"."sales" to "authenticated";

grant truncate on table "public"."sales" to "authenticated";

grant update on table "public"."sales" to "authenticated";

grant delete on table "public"."sales" to "service_role";

grant insert on table "public"."sales" to "service_role";

grant references on table "public"."sales" to "service_role";

grant select on table "public"."sales" to "service_role";

grant trigger on table "public"."sales" to "service_role";

grant truncate on table "public"."sales" to "service_role";

grant update on table "public"."sales" to "service_role";


  create policy "RLS_Expenses"
  on "public"."expenses"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "RLS_Inventory"
  on "public"."inventory"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "RLS_Profiles"
  on "public"."profiles"
  as permissive
  for all
  to public
using ((auth.uid() = id));



  create policy "RLS_Sales"
  on "public"."sales"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER trg_inventory_stock_sync BEFORE INSERT OR UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.calculate_stock_total();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


