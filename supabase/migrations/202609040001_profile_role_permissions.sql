-- Keep account roles assigned by handle_new_user(), not by self-service updates.
-- Existing own-row RLS still applies to the two editable profile fields.
revoke update on table public.profiles from authenticated;
grant update (display_name, phone) on table public.profiles to authenticated;

comment on column public.profiles.role is
  'Assigned on signup. Authenticated clients cannot update this column.';
