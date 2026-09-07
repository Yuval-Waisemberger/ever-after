-- Security-only follow-up. Review and apply separately; no row backfill.
begin;

create or replace function public.is_vendor_account()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'vendor');
$$;
revoke all on function public.is_vendor_account() from public;
grant execute on function public.is_vendor_account() to authenticated;

-- Guard every downstream owner policy, including any legacy wrong-role parent.
create or replace function public.owns_wedding(target_wedding_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_couple_account() and exists (
    select 1 from public.weddings where id = target_wedding_id and owner_user_id = (select auth.uid())
  );
$$;
create or replace function public.owns_budget_item(target_budget_item_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.budget_items where id = target_budget_item_id and public.owns_wedding(wedding_id));
$$;
create or replace function public.owns_assistant_thread(target_thread_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.assistant_threads where id = target_thread_id and public.owns_wedding(wedding_id));
$$;
create or replace function public.owns_vendor(target_vendor_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_vendor_account() and exists (
    select 1 from public.vendor_profiles where id = target_vendor_id and owner_user_id = (select auth.uid())
  );
$$;

-- Restrictive guards intersect existing ownership policies; they never grant access.
create policy weddings_couple_role on public.weddings as restrictive
for all to authenticated using (public.is_couple_account()) with check (public.is_couple_account());
create policy vendors_insert_role on public.vendor_profiles as restrictive
for insert to authenticated with check (public.is_vendor_account());
create policy vendors_update_role on public.vendor_profiles as restrictive
for update to authenticated using (public.is_vendor_account()) with check (public.is_vendor_account());
create policy vendors_delete_role on public.vendor_profiles as restrictive
for delete to authenticated using (public.is_vendor_account());
alter policy vendors_owner_read on public.vendor_profiles using (public.owns_vendor(id));

-- FK existence does not imply public visibility. Prevent the SECURITY DEFINER
-- booking sync from revealing an unpublished vendor's facts via a forged ID.
-- Existing relationships can still be managed after a vendor unpublishes.
create policy couple_vendors_visible_insert on public.couple_vendors as restrictive
for insert to authenticated with check (
  vendor_id is null or exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.is_public)
);

-- FK cascades bypass child RLS. A Vendor must not delete Couple-owned history
-- (including reviews) by deleting its own business profile.
alter table public.couple_vendors drop constraint couple_vendors_vendor_id_fkey;
alter table public.couple_vendors add constraint couple_vendors_vendor_id_fkey
  foreign key (vendor_id) references public.vendor_profiles(id) on delete restrict;
alter table public.reviews drop constraint reviews_vendor_id_fkey;
alter table public.reviews add constraint reviews_vendor_id_fkey
  foreign key (vendor_id) references public.vendor_profiles(id) on delete restrict;

commit;
