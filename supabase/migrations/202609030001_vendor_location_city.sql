-- The product specification requires a physical city/area for venues and a useful
-- home-base city for marketplace search. Regional coverage remains in service_areas.
alter table public.vendor_profiles
  add column if not exists location_city text
  check (location_city is null or char_length(location_city) between 1 and 100);

create index if not exists vendor_profiles_location_city_idx
  on public.vendor_profiles (lower(location_city));

comment on column public.vendor_profiles.location_city is
  'Physical venue city or vendor home-base city; service_areas stores regional coverage.';
