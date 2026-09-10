-- Separate Vendor identity images from vendor_images business/gallery records.
-- Existing profiles keep a null image; no files or records are backfilled.
begin;

alter table public.vendor_profiles
  add column profile_image_storage_path text,
  add constraint vendor_profile_image_storage_path_owned check (
    profile_image_storage_path is null
    or (
      split_part(profile_image_storage_path, '/', 1) = id::text
      and profile_image_storage_path ~ '^[^/]+/profile/[^/]+$'
      and split_part(profile_image_storage_path, '/', 3) not in ('.', '..')
    )
  );

comment on column public.vendor_profiles.profile_image_storage_path is
  'Vendor identity image object path in vendor-media: <vendor_profiles.id>/profile/<filename>. Separate from vendor_images; null means no selected identity image.';

commit;
