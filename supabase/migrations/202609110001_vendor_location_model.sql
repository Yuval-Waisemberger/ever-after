begin;

lock table public.vendor_profiles in share row exclusive mode;

do $$
begin
  if exists (
    select 1
    from public.vendor_profiles v
    join public.vendor_subcategories s on s.id = v.subcategory_id
    where v.is_public
      and s.slug in ('wedding-venues', 'preparation-hotels')
      and (
        cardinality(v.service_areas) <> 1
        or v.service_areas[1] = 'flexible'::public.wedding_area
      )
  ) then
    raise exception 'Published fixed-location Vendors must have exactly one non-flexible canonical service-area value before migration';
  end if;
end
$$;

create type public.vendor_location_mode as enum ('fixed', 'mobile');

alter table public.vendor_profiles
  add column location_mode public.vendor_location_mode not null default 'mobile',
  add column physical_area public.wedding_area;

update public.vendor_profiles v
set
  location_mode = case
    when s.slug in ('wedding-venues', 'preparation-hotels') then 'fixed'::public.vendor_location_mode
    else 'mobile'::public.vendor_location_mode
  end,
  physical_area = case
    when s.slug in ('wedding-venues', 'preparation-hotels')
      and cardinality(v.service_areas) = 1
      and v.service_areas[1] <> 'flexible'::public.wedding_area
      then v.service_areas[1]
    else null
  end
from public.vendor_subcategories s
where s.id = v.subcategory_id;

alter table public.vendor_profiles
  add constraint vendor_profiles_physical_area_not_flexible
    check (physical_area is null or physical_area <> 'flexible'::public.wedding_area),
  add constraint vendor_profiles_mobile_has_no_physical_area
    check (location_mode <> 'mobile'::public.vendor_location_mode or physical_area is null),
  add constraint vendor_profiles_service_areas_flexible_exclusive
    check (not ('flexible'::public.wedding_area = any(service_areas) and cardinality(service_areas) > 1)),
  add constraint vendor_profiles_published_fixed_location_complete
    check (
      not is_public
      or location_mode <> 'fixed'::public.vendor_location_mode
      or (
        location_city is not null
        and btrim(location_city) <> ''
        and physical_area is not null
      )
    );

create index vendor_profiles_public_fixed_area_idx
  on public.vendor_profiles (physical_area)
  where is_public and location_mode = 'fixed'::public.vendor_location_mode;

comment on column public.vendor_profiles.location_mode is
  'Controls location semantics: fixed Vendors match by physical_area; mobile Vendors match by service_areas.';
comment on column public.vendor_profiles.physical_area is
  'Physical region for a fixed-location Vendor; null for mobile Vendors.';

commit;
