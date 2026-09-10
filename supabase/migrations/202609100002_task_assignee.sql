-- Add stable Couple-relative task assignment without storing mutable partner names.
-- Existing tasks remain NULL and are interpreted by the application as Other.
begin;

alter table public.tasks
  add column assignee text,
  add constraint tasks_assignee_valid check (
    assignee is null
    or assignee in ('partner_one', 'partner_two', 'other')
  );

comment on column public.tasks.assignee is
  'Couple-relative assignment: partner_one, partner_two, or other. NULL is reserved for legacy tasks and is interpreted as Other; partner display names remain canonical in weddings.';

commit;
