-- Wedding Planner core schema.
-- Apply only to the existing wedding-planner-project Supabase project after review.

create extension if not exists pgcrypto;

create type public.app_role as enum ('couple', 'vendor');
create type public.setup_status as enum ('not_started', 'skipped', 'completed');
create type public.venue_status as enum ('booked', 'not_yet', 'looking');
create type public.wedding_area as enum (
  'central_israel', 'sharon', 'north', 'jerusalem', 'south', 'flexible'
);
create type public.wedding_event_type as enum (
  'evening', 'friday_afternoon', 'daytime', 'undecided'
);
create type public.vendor_relation_status as enum (
  'saved', 'contacted', 'considering', 'booked', 'rejected'
);
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.task_status as enum ('open', 'in_progress', 'completed');
create type public.assistant_message_role as enum ('user', 'assistant');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  display_name text not null check (char_length(display_name) between 1 and 100),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references public.profiles(id) on delete cascade,
  partner_one_name text not null check (char_length(partner_one_name) between 1 and 80),
  partner_two_name text not null check (char_length(partner_two_name) between 1 and 80),
  partner_one_phone text,
  partner_two_phone text,
  second_email text,
  wedding_date date,
  venue_status public.venue_status,
  venue_name text,
  guest_count integer check (guest_count between 1 and 5000),
  preferred_area public.wedding_area,
  event_type public.wedding_event_type,
  styles text[] not null default '{}',
  priorities text[] not null default '{}',
  booked_categories text[] not null default '{}',
  total_budget_minor bigint check (total_budget_minor >= 0),
  setup_status public.setup_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_name_when_booked check (
    venue_status <> 'booked' or nullif(btrim(venue_name), '') is not null
  )
);

create table public.vendor_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  description text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.vendor_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vendor_categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (id, category_id),
  unique (category_id, name)
);

create table public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  business_name text not null check (char_length(business_name) between 1 and 120),
  contact_name text,
  description text,
  category_id uuid references public.vendor_categories(id) on delete restrict,
  subcategory_id uuid,
  service_areas public.wedding_area[] not null default '{}',
  min_price_minor bigint check (min_price_minor >= 0),
  max_price_minor bigint check (max_price_minor >= 0),
  services text[] not null default '{}',
  styles text[] not null default '{}',
  event_types public.wedding_event_type[] not null default '{}',
  min_guest_capacity integer check (min_guest_capacity > 0),
  max_guest_capacity integer check (max_guest_capacity > 0),
  friday_available boolean,
  indoor_available boolean,
  outdoor_available boolean,
  phone text,
  email text,
  website_url text,
  instagram_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_price_order check (
    min_price_minor is null or max_price_minor is null or min_price_minor <= max_price_minor
  ),
  constraint vendor_capacity_order check (
    min_guest_capacity is null or max_guest_capacity is null or min_guest_capacity <= max_guest_capacity
  ),
  constraint vendor_subcategory_matches_category
    foreign key (subcategory_id, category_id)
    references public.vendor_subcategories(id, category_id)
    on delete restrict
);

create table public.vendor_images (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  storage_path text,
  external_url text,
  alt_text text not null default '',
  sort_order smallint not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint one_image_source check (
    (storage_path is not null)::integer + (external_url is not null)::integer = 1
  )
);

create unique index vendor_images_one_primary_idx
  on public.vendor_images(vendor_id)
  where is_primary;

create table public.couple_vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  status public.vendor_relation_status not null default 'saved',
  agreed_price_minor bigint check (agreed_price_minor >= 0),
  private_notes text,
  contact_override text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, vendor_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  notes text,
  category text,
  due_date date,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  couple_vendor_id uuid references public.couple_vendors(id) on delete set null,
  label text not null check (char_length(label) between 1 and 160),
  category text,
  estimated_amount_minor bigint check (estimated_amount_minor >= 0),
  committed_amount_minor bigint check (committed_amount_minor >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_item_has_amount check (
    estimated_amount_minor is not null or committed_amount_minor is not null
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  budget_item_id uuid not null references public.budget_items(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  amount_minor bigint not null check (amount_minor > 0),
  due_date date,
  is_paid boolean not null default false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paid_date_consistency check (
    (is_paid and paid_at is not null) or (not is_paid and paid_at is null)
  )
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  wedding_id uuid references public.weddings(id) on delete cascade,
  reviewer_display_name text not null check (char_length(reviewer_display_name) between 1 and 100),
  professionalism smallint not null check (professionalism between 1 and 5),
  punctuality smallint not null check (punctuality between 1 and 5),
  service_attitude smallint not null check (service_attitude between 1 and 5),
  value_for_money smallint not null check (value_for_money between 1 and 5),
  would_choose_again boolean not null,
  review_text text check (char_length(review_text) <= 3000),
  is_public boolean not null default true,
  is_seeded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_authorship check (
    (is_seeded and wedding_id is null) or (not is_seeded and wedding_id is not null)
  )
);

alter table public.reviews
  add constraint reviews_one_per_wedding_vendor unique (wedding_id, vendor_id);

create table public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null default 'Wedding Assistant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.assistant_threads(id) on delete cascade,
  role public.assistant_message_role not null,
  content text not null check (char_length(content) between 1 and 12000),
  source_labels text[] not null default '{}',
  action_proposal jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index vendor_profiles_marketplace_idx
  on public.vendor_profiles(is_public, category_id, subcategory_id, created_at desc);
create index vendor_profiles_price_idx
  on public.vendor_profiles(min_price_minor, max_price_minor)
  where is_public;
create index vendor_profiles_capacity_idx
  on public.vendor_profiles(min_guest_capacity, max_guest_capacity)
  where is_public;
create index vendor_profiles_service_areas_idx on public.vendor_profiles using gin(service_areas);
create index vendor_profiles_styles_idx on public.vendor_profiles using gin(styles);
create index vendor_profiles_event_types_idx on public.vendor_profiles using gin(event_types);
create index vendor_profiles_services_idx on public.vendor_profiles using gin(services);
create index vendor_images_vendor_order_idx on public.vendor_images(vendor_id, sort_order);
create index couple_vendors_wedding_status_idx on public.couple_vendors(wedding_id, status);
create index couple_vendors_vendor_idx on public.couple_vendors(vendor_id);
create index tasks_wedding_status_due_idx on public.tasks(wedding_id, status, due_date);
create index budget_items_wedding_idx on public.budget_items(wedding_id);
create index payments_item_paid_due_idx on public.payments(budget_item_id, is_paid, due_date);
create index reviews_vendor_public_created_idx on public.reviews(vendor_id, is_public, created_at desc);
create index assistant_threads_wedding_updated_idx on public.assistant_threads(wedding_id, updated_at desc);
create index assistant_messages_thread_created_idx on public.assistant_messages(thread_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger weddings_updated_at before update on public.weddings
for each row execute function public.set_updated_at();
create trigger vendor_profiles_updated_at before update on public.vendor_profiles
for each row execute function public.set_updated_at();
create trigger couple_vendors_updated_at before update on public.couple_vendors
for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();
create trigger budget_items_updated_at before update on public.budget_items
for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();
create trigger reviews_updated_at before update on public.reviews
for each row execute function public.set_updated_at();
create trigger assistant_threads_updated_at before update on public.assistant_threads
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.app_role;
  requested_name text;
  requested_business_name text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' = 'vendor' then 'vendor'::public.app_role
    else 'couple'::public.app_role
  end;
  requested_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'business_name'), ''),
    split_part(coalesce(new.email, 'New account'), '@', 1)
  );

  insert into public.profiles (id, role, display_name, phone)
  values (new.id, requested_role, requested_name, new.raw_user_meta_data ->> 'phone');

  if requested_role = 'couple' then
    insert into public.weddings (
      owner_user_id,
      partner_one_name,
      partner_two_name,
      partner_one_phone,
      partner_two_phone,
      second_email
    ) values (
      new.id,
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'partner_one_name'), ''), 'Partner 1'),
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'partner_two_name'), ''), 'Partner 2'),
      new.raw_user_meta_data ->> 'partner_one_phone',
      new.raw_user_meta_data ->> 'partner_two_phone',
      new.raw_user_meta_data ->> 'second_email'
    );
  else
    requested_business_name := coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'business_name'), ''),
      requested_name
    );
    insert into public.vendor_profiles (
      owner_user_id,
      slug,
      business_name,
      contact_name,
      phone,
      email
    ) values (
      new.id,
      trim(both '-' from regexp_replace(lower(requested_business_name), '[^a-z0-9]+', '-', 'g'))
        || '-' || substr(new.id::text, 1, 8),
      requested_business_name,
      new.raw_user_meta_data ->> 'contact_name',
      new.raw_user_meta_data ->> 'phone',
      new.email
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on table public.weddings is 'One editable wedding details source of truth per shared Couple account.';
comment on table public.tasks is 'Task source of truth; Wedding Timeline is derived from dated rows.';
comment on table public.couple_vendors is 'Lightweight per-wedding vendor status and private notes.';
comment on column public.budget_items.estimated_amount_minor is 'Estimated amount in Israeli agorot.';
comment on column public.budget_items.committed_amount_minor is 'Contractually committed amount in Israeli agorot.';
