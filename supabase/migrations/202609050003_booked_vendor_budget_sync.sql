-- Make the Booked vendor -> Committed budget relationship reliable at the
-- database boundary. Payments remain the only source of the Paid total.

alter table public.budget_items
  add column source text not null default 'manual'
  check (source in ('manual', 'booked_vendor'));

do $$
begin
  if exists (
    select couple_vendor_id
    from public.budget_items
    where couple_vendor_id is not null
    group by couple_vendor_id
    having count(*) > 1
  ) then
    raise exception 'Cannot add one-budget-item-per-vendor rule: duplicate couple_vendor_id values exist';
  end if;
end;
$$;

create unique index budget_items_one_per_couple_vendor_idx
  on public.budget_items(couple_vendor_id)
  where couple_vendor_id is not null;

create or replace function public.sync_booked_vendor_budget_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  vendor_label text;
  vendor_category text;
  prior_agreed_price_minor bigint;
begin
  if tg_op = 'UPDATE' then
    prior_agreed_price_minor := old.agreed_price_minor;
  end if;

  if new.status = 'booked' and new.agreed_price_minor is not null then
    select
      coalesce(marketplace.business_name, external.business_name, 'Booked vendor'),
      coalesce(subcategory.name, category.name, 'Vendor')
    into vendor_label, vendor_category
    from (select 1) seed
    left join public.vendor_profiles marketplace on marketplace.id = new.vendor_id
    left join public.external_vendors external on external.id = new.external_vendor_id
    left join public.vendor_subcategories subcategory
      on subcategory.id = coalesce(marketplace.subcategory_id, external.subcategory_id)
    left join public.vendor_categories category
      on category.id = coalesce(marketplace.category_id, external.category_id);

    insert into public.budget_items (
      wedding_id,
      couple_vendor_id,
      label,
      category,
      estimated_amount_minor,
      committed_amount_minor,
      source
    ) values (
      new.wedding_id,
      new.id,
      vendor_label,
      vendor_category,
      new.agreed_price_minor,
      new.agreed_price_minor,
      'booked_vendor'
    )
    on conflict (couple_vendor_id) where couple_vendor_id is not null
    do update set
      label = excluded.label,
      category = excluded.category,
      estimated_amount_minor = case
        when public.budget_items.source = 'manual'
          then public.budget_items.estimated_amount_minor
        else excluded.estimated_amount_minor
      end,
      committed_amount_minor = excluded.committed_amount_minor,
      source = case
        when public.budget_items.source = 'manual' then 'manual'
        else excluded.source
      end;
  else
    update public.budget_items
    set
      estimated_amount_minor = coalesce(
        estimated_amount_minor,
        prior_agreed_price_minor,
        new.agreed_price_minor
      ),
      committed_amount_minor = null
    where couple_vendor_id = new.id
      and source = 'booked_vendor';
  end if;

  return new;
end;
$$;

create trigger couple_vendors_sync_booked_budget
after insert or update of status, agreed_price_minor on public.couple_vendors
for each row execute function public.sync_booked_vendor_budget_item();

-- Bring existing booked relationships into the same invariant when this
-- migration is applied. Existing manually linked rows are updated, not removed.
insert into public.budget_items (
  wedding_id,
  couple_vendor_id,
  label,
  category,
  estimated_amount_minor,
  committed_amount_minor,
  source
)
select
  relation.wedding_id,
  relation.id,
  coalesce(marketplace.business_name, external.business_name, 'Booked vendor'),
  coalesce(subcategory.name, category.name, 'Vendor'),
  relation.agreed_price_minor,
  relation.agreed_price_minor,
  'booked_vendor'
from public.couple_vendors relation
left join public.vendor_profiles marketplace on marketplace.id = relation.vendor_id
left join public.external_vendors external on external.id = relation.external_vendor_id
left join public.vendor_subcategories subcategory
  on subcategory.id = coalesce(marketplace.subcategory_id, external.subcategory_id)
left join public.vendor_categories category
  on category.id = coalesce(marketplace.category_id, external.category_id)
where relation.status = 'booked'
  and relation.agreed_price_minor is not null
on conflict (couple_vendor_id) where couple_vendor_id is not null
do update set
  label = excluded.label,
  category = excluded.category,
  estimated_amount_minor = case
    when public.budget_items.source = 'manual'
      then public.budget_items.estimated_amount_minor
    else excluded.estimated_amount_minor
  end,
  committed_amount_minor = excluded.committed_amount_minor;

comment on column public.budget_items.source is
  'manual for Couple-created expenses; booked_vendor for automatic commitment synchronization.';
