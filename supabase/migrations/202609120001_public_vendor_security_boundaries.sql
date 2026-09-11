begin;

create view public.public_vendor_profiles
with (security_barrier = true, security_invoker = false) as
select
  v.id,
  v.slug,
  v.business_name,
  v.description,
  c.slug as category_slug,
  c.name as category_name,
  s.slug as subcategory_slug,
  s.name as subcategory_name,
  v.location_city,
  v.location_mode,
  v.physical_area,
  v.service_areas,
  v.min_price_minor,
  v.max_price_minor,
  v.services,
  v.styles,
  v.event_types,
  v.min_guest_capacity,
  v.max_guest_capacity,
  v.friday_available,
  v.phone,
  v.email,
  case
    when v.website_url is null then null
    when v.website_url = btrim(v.website_url)
      and v.website_url ~* '^https?://[^[:space:]]+$'
      then v.website_url
    else null
  end as website_url,
  case
    when v.instagram_url is null then null
    when v.instagram_url = btrim(v.instagram_url)
      and v.instagram_url ~* '^https?://[^[:space:]]+$'
      then v.instagram_url
    else null
  end as instagram_url
from public.vendor_profiles as v
left join public.vendor_categories as c on c.id = v.category_id
left join public.vendor_subcategories as s on s.id = v.subcategory_id
where v.is_public is true;

revoke all on public.public_vendor_profiles from public, anon, authenticated;
grant select on public.public_vendor_profiles to anon, authenticated;

create view public.public_vendor_images
with (security_barrier = true, security_invoker = false) as
select
  i.id,
  i.vendor_id,
  i.storage_path,
  i.external_url,
  i.alt_text,
  i.sort_order,
  i.is_primary
from public.vendor_images as i
join public.vendor_profiles as v on v.id = i.vendor_id and v.is_public is true;

revoke all on public.public_vendor_images from public, anon, authenticated;
grant select on public.public_vendor_images to anon, authenticated;

create view public.public_vendor_reviews
with (security_barrier = true, security_invoker = false) as
select
  r.id,
  r.vendor_id,
  r.reviewer_display_name,
  r.professionalism,
  r.punctuality,
  r.service_attitude,
  r.value_for_money,
  r.would_choose_again,
  r.review_text,
  r.created_at
from public.reviews as r
join public.vendor_profiles as v on v.id = r.vendor_id and v.is_public is true
where r.is_public is true;

revoke all on public.public_vendor_reviews from public, anon, authenticated;
grant select on public.public_vendor_reviews to anon, authenticated;

create view public.vendor_owner_reviews
with (security_barrier = true, security_invoker = false) as
select
  r.id,
  r.vendor_id,
  r.reviewer_display_name,
  r.professionalism,
  r.punctuality,
  r.service_attitude,
  r.value_for_money,
  r.would_choose_again,
  r.review_text,
  r.created_at
from public.reviews as r
where public.owns_vendor(r.vendor_id);

revoke all on public.vendor_owner_reviews from public, anon, authenticated;
grant select on public.vendor_owner_reviews to authenticated;

drop policy "vendors_public_read" on public.vendor_profiles;
revoke select on public.vendor_profiles from public, anon;

drop policy "vendor_images_public_read" on public.vendor_images;
revoke select on public.vendor_images from public, anon;

drop policy "reviews_public_read" on public.reviews;
revoke select on public.reviews from public, anon;

alter policy couple_vendors_visible_insert on public.couple_vendors
with check (
  vendor_id is null
  or exists (
    select 1
    from public.public_vendor_profiles as v
    where v.id = couple_vendors.vendor_id
  )
);

alter policy "reviews_author_insert" on public.reviews
with check (
  not is_seeded
  and wedding_id is not null
  and public.owns_wedding(wedding_id)
  and exists (
    select 1
    from public.public_vendor_profiles as v
    where v.id = reviews.vendor_id
  )
);

alter policy "reviews_author_update" on public.reviews
using (
  not is_seeded
  and wedding_id is not null
  and public.owns_wedding(wedding_id)
)
with check (
  not is_seeded
  and wedding_id is not null
  and public.owns_wedding(wedding_id)
  and exists (
    select 1
    from public.public_vendor_profiles as v
    where v.id = reviews.vendor_id
  )
);

alter table public.vendor_profiles
  add constraint vendor_profiles_website_url_http
  check (
    website_url is null
    or (
      website_url = btrim(website_url)
      and website_url ~* '^https?://[^[:space:]]+$'
    )
  ) not valid,
  add constraint vendor_profiles_instagram_url_http
  check (
    instagram_url is null
    or (
      instagram_url = btrim(instagram_url)
      and instagram_url ~* '^https?://[^[:space:]]+$'
    )
  ) not valid;

alter table public.external_vendors
  add constraint external_vendors_website_url_http
  check (
    website_url is null
    or (
      website_url = btrim(website_url)
      and website_url ~* '^https?://[^[:space:]]+$'
    )
  ) not valid;

commit;
