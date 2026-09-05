-- Couple identity choices and honest support for vendors that are not registered
-- in the public marketplace. This migration is additive and preserves existing
-- marketplace vendors and couple-vendor relationships.

create type public.couple_avatar_choice as enum (
  'woman_man',
  'woman_woman',
  'man_man',
  'heart'
);

alter table public.profiles
  add column avatar_choice public.couple_avatar_choice not null default 'heart',
  add column avatar_storage_path text,
  add constraint profiles_avatar_storage_path_owned check (
    avatar_storage_path is null
    or (
      split_part(avatar_storage_path, '/', 1) = id::text
      and position('/' in avatar_storage_path) > 0
      and split_part(avatar_storage_path, '/', 2) <> ''
      and right(avatar_storage_path, 1) <> '/'
    )
  );

grant update (avatar_choice, avatar_storage_path) on public.profiles to authenticated;

comment on column public.profiles.avatar_choice is
  'Privacy-friendly Couple icon and fallback metadata. The application renders this icon when avatar_storage_path is null.';
comment on column public.profiles.avatar_storage_path is
  'Private couple-media object path only, never a signed URL. A non-null path selects the uploaded image; avatar_choice remains its fallback.';

create or replace function public.is_couple_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'couple'
  );
$$;

revoke all on function public.is_couple_account() from public;
grant execute on function public.is_couple_account() to authenticated;

create or replace function public.can_manage_couple_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and position('/' in object_name) > 0
      and split_part(object_name, '/', 2) <> ''
      and right(object_name, 1) <> '/'
      then public.is_couple_account()
        and split_part(object_name, '/', 1)::uuid = (select auth.uid())
    else false
  end;
$$;

revoke all on function public.can_manage_couple_media(text) from public;
grant execute on function public.can_manage_couple_media(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-media',
  'couple-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "couple_media_owner_read" on storage.objects
for select to authenticated using (
  bucket_id = 'couple-media' and public.can_manage_couple_media(name)
);
create policy "couple_media_owner_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'couple-media' and public.can_manage_couple_media(name)
);
create policy "couple_media_owner_update" on storage.objects
for update to authenticated using (
  bucket_id = 'couple-media' and public.can_manage_couple_media(name)
) with check (
  bucket_id = 'couple-media' and public.can_manage_couple_media(name)
);
create policy "couple_media_owner_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'couple-media' and public.can_manage_couple_media(name)
);

create table public.external_vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  category_id uuid references public.vendor_categories(id) on delete restrict,
  subcategory_id uuid,
  business_name text not null check (
    char_length(
      regexp_replace(business_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')
    ) between 1 and 120
  ),
  contact_name text,
  phone text,
  email text,
  website_url text,
  image_storage_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id),
  constraint external_vendor_subcategory_requires_category check (
    subcategory_id is null or category_id is not null
  ),
  constraint external_vendor_subcategory_matches_category
    foreign key (subcategory_id, category_id)
    references public.vendor_subcategories(id, category_id)
    on delete restrict
);

create index external_vendors_wedding_idx on public.external_vendors(wedding_id);

create trigger external_vendors_updated_at before update on public.external_vendors
for each row execute function public.set_updated_at();

alter table public.external_vendors enable row level security;
revoke all on public.external_vendors from anon, authenticated;
grant select, insert, update, delete on public.external_vendors to authenticated;

create policy "external_vendors_owner_all" on public.external_vendors
for all to authenticated using (
  public.is_couple_account() and public.owns_wedding(wedding_id)
)
with check (
  public.is_couple_account() and public.owns_wedding(wedding_id)
);

alter table public.couple_vendors
  alter column vendor_id drop not null,
  add column external_vendor_id uuid,
  add column is_saved boolean not null default false;

update public.couple_vendors
set is_saved = true
where status = 'saved';

alter table public.couple_vendors
  add constraint couple_vendors_exactly_one_vendor check (
    num_nonnulls(vendor_id, external_vendor_id) = 1
  ),
  add constraint couple_vendors_external_vendor_same_wedding
    foreign key (external_vendor_id, wedding_id)
    references public.external_vendors(id, wedding_id)
    on delete cascade;

create unique index couple_vendors_external_unique_idx
  on public.couple_vendors(wedding_id, external_vendor_id)
  where external_vendor_id is not null;

create index couple_vendors_external_vendor_idx
  on public.couple_vendors(external_vendor_id)
  where external_vendor_id is not null;

comment on column public.couple_vendors.is_saved is
  'Independent bookmark flag. Lifecycle status may simultaneously be contacted, considering, booked, or rejected. The saved status value remains only for current/legacy application compatibility and is not the long-term Save mechanism.';
comment on table public.external_vendors is
  'Couple-owned vendors that are not registered marketplace businesses; never exposed as public vendor profiles.';
comment on column public.external_vendors.image_storage_path is
  'Reserved nullable private object path for a future validated external-vendor image flow. This migration does not expose external-vendor images publicly or implement upload behavior.';
