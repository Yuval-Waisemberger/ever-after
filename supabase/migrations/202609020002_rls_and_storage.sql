-- Grants, Row Level Security, and vendor-media Storage policies.

create or replace function public.owns_wedding(target_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.weddings
    where id = target_wedding_id
      and owner_user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_vendor(target_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vendor_profiles
    where id = target_vendor_id
      and owner_user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_budget_item(target_budget_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.budget_items bi
    join public.weddings w on w.id = bi.wedding_id
    where bi.id = target_budget_item_id
      and w.owner_user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_assistant_thread(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assistant_threads t
    join public.weddings w on w.id = t.wedding_id
    where t.id = target_thread_id
      and w.owner_user_id = (select auth.uid())
  );
$$;

create or replace function public.can_manage_vendor_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.owns_vendor(split_part(object_name, '/', 1)::uuid)
    else false
  end;
$$;

grant execute on function public.owns_wedding(uuid) to authenticated;
grant execute on function public.owns_vendor(uuid) to authenticated;
grant execute on function public.owns_budget_item(uuid) to authenticated;
grant execute on function public.owns_assistant_thread(uuid) to authenticated;
grant execute on function public.can_manage_vendor_media(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.vendor_categories enable row level security;
alter table public.vendor_subcategories enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.vendor_images enable row level security;
alter table public.couple_vendors enable row level security;
alter table public.tasks enable row level security;
alter table public.budget_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.vendor_categories, public.vendor_subcategories to anon, authenticated;
grant select on public.vendor_profiles, public.vendor_images, public.reviews to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.weddings to authenticated;
grant insert, update, delete on public.vendor_profiles, public.vendor_images to authenticated;
grant select, insert, update, delete on public.couple_vendors, public.tasks,
  public.budget_items, public.payments, public.assistant_threads, public.assistant_messages
  to authenticated;
grant insert, update, delete on public.reviews to authenticated;

create policy "profiles_select_own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "weddings_select_own" on public.weddings
for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "weddings_insert_own" on public.weddings
for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy "weddings_update_own" on public.weddings
for update to authenticated using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);
create policy "weddings_delete_own" on public.weddings
for delete to authenticated using ((select auth.uid()) = owner_user_id);

create policy "categories_public_read" on public.vendor_categories
for select to anon, authenticated using (true);
create policy "subcategories_public_read" on public.vendor_subcategories
for select to anon, authenticated using (true);

create policy "vendors_public_read" on public.vendor_profiles
for select to anon, authenticated using (is_public);
create policy "vendors_owner_read" on public.vendor_profiles
for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "vendors_owner_insert" on public.vendor_profiles
for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy "vendors_owner_update" on public.vendor_profiles
for update to authenticated using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);
create policy "vendors_owner_delete" on public.vendor_profiles
for delete to authenticated using ((select auth.uid()) = owner_user_id);

create policy "vendor_images_public_read" on public.vendor_images
for select to anon, authenticated using (
  exists (
    select 1 from public.vendor_profiles v
    where v.id = vendor_images.vendor_id and v.is_public
  )
);
create policy "vendor_images_owner_read" on public.vendor_images
for select to authenticated using (public.owns_vendor(vendor_id));
create policy "vendor_images_owner_insert" on public.vendor_images
for insert to authenticated with check (public.owns_vendor(vendor_id));
create policy "vendor_images_owner_update" on public.vendor_images
for update to authenticated using (public.owns_vendor(vendor_id))
with check (public.owns_vendor(vendor_id));
create policy "vendor_images_owner_delete" on public.vendor_images
for delete to authenticated using (public.owns_vendor(vendor_id));

create policy "couple_vendors_owner_all" on public.couple_vendors
for all to authenticated using (public.owns_wedding(wedding_id))
with check (public.owns_wedding(wedding_id));
create policy "tasks_owner_all" on public.tasks
for all to authenticated using (public.owns_wedding(wedding_id))
with check (public.owns_wedding(wedding_id));
create policy "budget_items_owner_all" on public.budget_items
for all to authenticated using (public.owns_wedding(wedding_id))
with check (
  public.owns_wedding(wedding_id)
  and (
    couple_vendor_id is null
    or exists (
      select 1 from public.couple_vendors cv
      where cv.id = budget_items.couple_vendor_id
        and cv.wedding_id = budget_items.wedding_id
    )
  )
);
create policy "payments_owner_all" on public.payments
for all to authenticated using (public.owns_budget_item(budget_item_id))
with check (public.owns_budget_item(budget_item_id));

create policy "reviews_public_read" on public.reviews
for select to anon, authenticated using (is_public);
create policy "reviews_author_read" on public.reviews
for select to authenticated using (wedding_id is not null and public.owns_wedding(wedding_id));
create policy "reviews_author_insert" on public.reviews
for insert to authenticated with check (
  not is_seeded and wedding_id is not null and public.owns_wedding(wedding_id)
);
create policy "reviews_author_update" on public.reviews
for update to authenticated using (
  not is_seeded and wedding_id is not null and public.owns_wedding(wedding_id)
) with check (
  not is_seeded and wedding_id is not null and public.owns_wedding(wedding_id)
);
create policy "reviews_author_delete" on public.reviews
for delete to authenticated using (
  not is_seeded and wedding_id is not null and public.owns_wedding(wedding_id)
);

create policy "assistant_threads_owner_all" on public.assistant_threads
for all to authenticated using (public.owns_wedding(wedding_id))
with check (public.owns_wedding(wedding_id));
create policy "assistant_messages_owner_all" on public.assistant_messages
for all to authenticated using (public.owns_assistant_thread(thread_id))
with check (public.owns_assistant_thread(thread_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-media',
  'vendor-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "vendor_media_public_read" on storage.objects
for select to anon, authenticated using (bucket_id = 'vendor-media');
create policy "vendor_media_owner_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'vendor-media' and public.can_manage_vendor_media(name)
);
create policy "vendor_media_owner_update" on storage.objects
for update to authenticated using (
  bucket_id = 'vendor-media' and public.can_manage_vendor_media(name)
) with check (
  bucket_id = 'vendor-media' and public.can_manage_vendor_media(name)
);
create policy "vendor_media_owner_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'vendor-media' and public.can_manage_vendor_media(name)
);
