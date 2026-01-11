
  create table "public"."vouchers" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null default auth.uid(),
    "code" text not null,
    "initial_amount" numeric(12,2) not null,
    "current_amount" numeric(12,2) not null,
    "status" text default 'active'::text,
    "expires_at" timestamp with time zone default (now() + '3 mons'::interval),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."vouchers" enable row level security;

alter table "public"."sales" add column "expires_at" date;

alter table "public"."sales" add column "list_price" numeric(12,2);

alter table "public"."sales" add column "payment_details" jsonb default '[]'::jsonb;

alter table "public"."sales" add column "status" text default 'completed'::text;

CREATE INDEX idx_sales_expires_at ON public.sales USING btree (expires_at);

CREATE INDEX idx_sales_status ON public.sales USING btree (status);

CREATE INDEX idx_vouchers_code ON public.vouchers USING btree (code);

CREATE UNIQUE INDEX unique_voucher_code_per_user ON public.vouchers USING btree (user_id, code);

CREATE UNIQUE INDEX vouchers_code_key ON public.vouchers USING btree (code);

CREATE UNIQUE INDEX vouchers_pkey ON public.vouchers USING btree (id);

alter table "public"."vouchers" add constraint "vouchers_pkey" PRIMARY KEY using index "vouchers_pkey";

alter table "public"."sales" add constraint "sales_status_check" CHECK ((status = ANY (ARRAY['completed'::text, 'pending'::text, 'cancelled'::text]))) not valid;

alter table "public"."sales" validate constraint "sales_status_check";

alter table "public"."vouchers" add constraint "unique_voucher_code_per_user" UNIQUE using index "unique_voucher_code_per_user";

alter table "public"."vouchers" add constraint "vouchers_code_key" UNIQUE using index "vouchers_code_key";

alter table "public"."vouchers" add constraint "vouchers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text]))) not valid;

alter table "public"."vouchers" validate constraint "vouchers_status_check";

grant delete on table "public"."vouchers" to "anon";

grant insert on table "public"."vouchers" to "anon";

grant references on table "public"."vouchers" to "anon";

grant select on table "public"."vouchers" to "anon";

grant trigger on table "public"."vouchers" to "anon";

grant truncate on table "public"."vouchers" to "anon";

grant update on table "public"."vouchers" to "anon";

grant delete on table "public"."vouchers" to "authenticated";

grant insert on table "public"."vouchers" to "authenticated";

grant references on table "public"."vouchers" to "authenticated";

grant select on table "public"."vouchers" to "authenticated";

grant trigger on table "public"."vouchers" to "authenticated";

grant truncate on table "public"."vouchers" to "authenticated";

grant update on table "public"."vouchers" to "authenticated";

grant delete on table "public"."vouchers" to "service_role";

grant insert on table "public"."vouchers" to "service_role";

grant references on table "public"."vouchers" to "service_role";

grant select on table "public"."vouchers" to "service_role";

grant trigger on table "public"."vouchers" to "service_role";

grant truncate on table "public"."vouchers" to "service_role";

grant update on table "public"."vouchers" to "service_role";


  create policy "RLS_Vouchers"
  on "public"."vouchers"
  as permissive
  for all
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



