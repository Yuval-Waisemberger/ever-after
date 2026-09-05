-- Lightweight Couple-owned guest and RSVP planning.

create type public.guest_rsvp_status as enum (
  'not_invited',
  'invited',
  'attending',
  'not_attending'
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  party_name text,
  phone text,
  email text,
  rsvp_status public.guest_rsvp_status not null default 'not_invited',
  invited_guest_count smallint not null default 1 check (invited_guest_count between 1 and 20),
  attending_guest_count smallint check (
    attending_guest_count is null
    or attending_guest_count between 0 and invited_guest_count
  ),
  dietary_notes text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guests_wedding_status_name_idx
  on public.guests(wedding_id, rsvp_status, full_name);

create trigger guests_updated_at before update on public.guests
for each row execute function public.set_updated_at();

alter table public.guests enable row level security;
revoke all on public.guests from anon, authenticated;
grant select, insert, update, delete on public.guests to authenticated;

create policy "guests_owner_all" on public.guests
for all to authenticated using (public.owns_wedding(wedding_id))
with check (public.owns_wedding(wedding_id));

comment on table public.guests is
  'Couple-owned guest and RSVP planning; not a public or vendor-visible directory.';

