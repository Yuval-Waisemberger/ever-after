-- Lightweight Couple-owned guest and RSVP planning.

create type public.guest_rsvp_status as enum (
  'not_invited',
  'invited',
  'attending',
  'not_attending'
);

create type public.guest_side as enum (
  'partner_one',
  'partner_two',
  'both'
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  full_name text not null,
  party_name text,
  guest_group text,
  side public.guest_side,
  phone text,
  email text,
  rsvp_status public.guest_rsvp_status not null default 'not_invited',
  invited_count smallint not null default 1,
  attending_count smallint,
  dietary_notes text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_full_name_valid check (
    char_length(
      regexp_replace(full_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')
    ) between 1 and 160
  ),
  constraint guests_party_name_length check (
    party_name is null or char_length(party_name) <= 120
  ),
  constraint guests_guest_group_length check (
    guest_group is null or char_length(guest_group) <= 80
  ),
  constraint guests_phone_length check (
    phone is null or char_length(phone) <= 40
  ),
  constraint guests_email_length check (
    email is null or char_length(email) <= 254
  ),
  constraint guests_dietary_notes_length check (
    dietary_notes is null or char_length(dietary_notes) <= 2000
  ),
  constraint guests_private_notes_length check (
    private_notes is null or char_length(private_notes) <= 3000
  ),
  constraint guests_invited_count_bounds check (
    invited_count between 1 and 20
  ),
  constraint guests_attending_count_bounds check (
    attending_count is null or attending_count between 0 and 20
  ),
  constraint guests_rsvp_attendance_consistency check (
    (rsvp_status in ('not_invited', 'invited') and attending_count is null)
    or (
      rsvp_status = 'attending'
      and attending_count is not null
      and attending_count between 1 and invited_count
    )
    or (
      rsvp_status = 'not_attending'
      and attending_count is not null
      and attending_count = 0
    )
  )
);

create index guests_wedding_status_name_idx
  on public.guests(wedding_id, rsvp_status, full_name);

create trigger guests_updated_at before update on public.guests
for each row execute function public.set_updated_at();

alter table public.guests enable row level security;
revoke all on public.guests from anon, authenticated;
grant select, insert, update, delete on public.guests to authenticated;

create policy "guests_owner_all" on public.guests
for all to authenticated using (
  public.is_couple_account() and public.owns_wedding(wedding_id)
)
with check (
  public.is_couple_account() and public.owns_wedding(wedding_id)
);

comment on table public.guests is
  'Couple-owned guest and RSVP planning. One row represents one invitation party or household. This table is not public or vendor-visible. weddings.guest_count remains a planning estimate and is not automatically synchronized with Guest List data.';

comment on column public.guests.full_name is
  'Primary guest or contact label for the invitation party or household.';

comment on column public.guests.party_name is
  'Optional invitation-party or household label, such as Cohen Family or Dana & Tom.';

comment on column public.guests.invited_count is
  'Number of people invited in this invitation party or household.';

comment on column public.guests.attending_count is
  'Confirmed attending headcount for this invitation party or household.';

comment on column public.guests.guest_group is
  'Optional Couple-defined grouping, such as Family, Friends, Work, or University.';

comment on column public.guests.side is
  'Canonical wedding side: partner_one, partner_two, or both; UI labels resolve against Wedding Details names.';
