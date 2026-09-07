-- Reviewed first application only; never use blind db push.
begin;
lock table public.external_vendors, public.couple_vendors, public.budget_items, public.payments in share row exclusive mode;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'budget_items' and column_name = 'source')
    or to_regclass('public.budget_items_one_per_couple_vendor_idx') is not null
    or exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      and p.proname in ('sync_booked_vendor_budget_item', 'protect_budget_item', 'protect_vendor_financial_history', 'validate_payment_schedule'))
    or exists (select 1 from pg_trigger where not tgisinternal and tgname in ('couple_vendors_sync_booked_budget',
      'budget_items_protect_canonical', 'couple_vendors_protect_financial_history', 'payments_validate_schedule')) then
    raise exception '050003 objects already exist; inspect prior/partial application before proceeding';
  end if;
  if exists (select couple_vendor_id from public.budget_items where couple_vendor_id is not null
      group by couple_vendor_id having count(*) > 1) then
    raise exception '050003 preflight: duplicate linked budget items require manual review';
  end if;
  if exists (select 1 from public.budget_items b left join public.weddings w on w.id = b.wedding_id
      left join public.couple_vendors c on c.id = b.couple_vendor_id
      where w.id is null or (b.couple_vendor_id is not null and (c.id is null or c.wedding_id <> b.wedding_id)))
    or exists (select 1 from public.payments p left join public.budget_items b on b.id = p.budget_item_id where b.id is null)
    or exists (select 1 from public.couple_vendors c left join public.weddings w on w.id = c.wedding_id
      left join public.external_vendors e on e.id = c.external_vendor_id left join public.vendor_profiles v on v.id = c.vendor_id
      where w.id is null or num_nonnulls(c.vendor_id, c.external_vendor_id) <> 1
        or (c.vendor_id is not null and v.id is null)
        or (c.external_vendor_id is not null and (e.id is null or e.wedding_id <> c.wedding_id))) then
    raise exception '050003 preflight: ownership/reference inconsistency';
  end if;
  -- Strict, objective adoption: no fuzzy names, merges, or financial corrections.
  if exists (select 1 from public.budget_items b join public.couple_vendors c on c.id = b.couple_vendor_id
      where c.status <> 'booked' or c.agreed_price_minor is null
        or b.committed_amount_minor is distinct from c.agreed_price_minor) then
    raise exception '050003 preflight: ambiguous legacy linked item requires review';
  end if;
end;
$$;

alter table public.budget_items add column source text not null default 'manual'
  constraint budget_items_source_check check (source in ('manual', 'booked_vendor'));
-- Preserve legacy ID, estimate, metadata, commitment and all payment records.
update public.budget_items set source = 'booked_vendor' where couple_vendor_id is not null;
create unique index budget_items_one_per_couple_vendor_idx
  on public.budget_items(couple_vendor_id) where couple_vendor_id is not null;
alter table public.budget_items add constraint budget_items_source_link_check check (
  (source = 'manual' and couple_vendor_id is null) or (source = 'booked_vendor' and couple_vendor_id is not null)
);

-- Only missing canonical items are inserted; adopted items are not rewritten.
insert into public.budget_items (wedding_id, couple_vendor_id, label, category, estimated_amount_minor, committed_amount_minor, source)
select c.wedding_id, c.id, coalesce(v.business_name, e.business_name, 'Booked vendor'),
  coalesce(s.name, cat.name, 'Vendor'), c.agreed_price_minor, c.agreed_price_minor, 'booked_vendor'
from public.couple_vendors c
left join public.vendor_profiles v on v.id = c.vendor_id
left join public.external_vendors e on e.id = c.external_vendor_id
left join public.vendor_subcategories s on s.id = coalesce(v.subcategory_id, e.subcategory_id)
left join public.vendor_categories cat on cat.id = coalesce(v.category_id, e.category_id)
where c.status = 'booked' and c.agreed_price_minor is not null
  and not exists (select 1 from public.budget_items b where b.couple_vendor_id = c.id);

create function public.sync_booked_vendor_budget_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- A trigger on an RLS-authorized relationship mutation, never a callable RPC.
  if new.status = 'booked' and new.agreed_price_minor is not null then
    insert into public.budget_items (wedding_id, couple_vendor_id, label, category, estimated_amount_minor, committed_amount_minor, source)
    select new.wedding_id, new.id, coalesce(v.business_name, e.business_name, 'Booked vendor'),
      coalesce(s.name, cat.name, 'Vendor'), new.agreed_price_minor, new.agreed_price_minor, 'booked_vendor'
    from (select 1) seed
    left join public.vendor_profiles v on v.id = new.vendor_id
    left join public.external_vendors e on e.id = new.external_vendor_id
    left join public.vendor_subcategories s on s.id = coalesce(v.subcategory_id, e.subcategory_id)
    left join public.vendor_categories cat on cat.id = coalesce(v.category_id, e.category_id)
    on conflict (couple_vendor_id) where couple_vendor_id is not null
    do update set committed_amount_minor = excluded.committed_amount_minor;
  else
    update public.budget_items set committed_amount_minor = null
    where couple_vendor_id = new.id and source = 'booked_vendor';
  end if;
  return new;
end;
$$;
revoke all on function public.sync_booked_vendor_budget_item() from public, anon, authenticated;

create function public.protect_budget_item()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare internal_sync boolean;
begin
  -- A caller cannot spoof this with a custom setting: the nested sync trigger
  -- must run as its trusted migration owner, not as authenticated.
  select pg_trigger_depth() > 1 and current_user = pg_get_userbyid(p.proowner)
    into internal_sync from pg_proc p where p.oid = 'public.sync_booked_vendor_budget_item()'::regprocedure;
  if tg_op = 'DELETE' then
    if old.source = 'booked_vendor' or exists (select 1 from public.payments where budget_item_id = old.id) then
      raise exception using errcode = '23514', message = 'Financial history is protected; change vendor lifecycle instead';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.wedding_id <> old.wedding_id then
      raise exception using errcode = '23514', message = 'Budget ownership and identity cannot be changed';
    end if;
    if not internal_sync and (new.source is distinct from old.source or new.couple_vendor_id is distinct from old.couple_vendor_id
      or (old.source = 'booked_vendor' and new.committed_amount_minor is distinct from old.committed_amount_minor)) then
      raise exception using errcode = '23514', message = 'Booking commitment is managed from vendor details';
    end if;
  elsif not internal_sync and (new.source <> 'manual' or new.couple_vendor_id is not null) then
    raise exception using errcode = '23514', message = 'Linked booking items are created by the database';
  end if;
  -- Keep the amount constraint valid through unbooking, without changing an existing estimate.
  if internal_sync and tg_op = 'UPDATE' and new.committed_amount_minor is null then
    new.estimated_amount_minor := coalesce(old.estimated_amount_minor, old.committed_amount_minor, 0);
  end if;
  return new;
end;
$$;

create function public.protect_vendor_financial_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.budget_items where couple_vendor_id = old.id) then
      raise exception using errcode = '23514', message = 'Financial history is protected; change vendor lifecycle instead';
    end if;
    return old;
  end if;
  if new.id <> old.id or new.wedding_id <> old.wedding_id or new.vendor_id is distinct from old.vendor_id
    or new.external_vendor_id is distinct from old.external_vendor_id then
    raise exception using errcode = '23514', message = 'Vendor relationship ownership and identity cannot be changed';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_vendor_financial_history() from public, anon, authenticated;

create function public.validate_payment_schedule()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  item public.budget_items%rowtype;
  scheduled numeric;
begin
  if tg_op = 'UPDATE' and (new.id <> old.id or new.budget_item_id <> old.budget_item_id) then
    raise exception using errcode = '23514', message = 'Payment history cannot be moved to another expense';
  end if;
  -- Parent locking serializes concurrent schedules with each other and price updates.
  -- Under READ COMMITTED the subsequent SUM sees the preceding committed writer.
  select * into item from public.budget_items
    where id = case when tg_op = 'DELETE' then old.budget_item_id else new.budget_item_id end for update;
  if not found then raise exception using errcode = '23514', message = 'Payment expense is unavailable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  -- Preserve history after reductions/unbooking; annotations and reductions remain possible.
  if tg_op = 'UPDATE' and new.amount_minor <= old.amount_minor then return new; end if;
  if item.committed_amount_minor is null or item.committed_amount_minor <= 0 then
    raise exception using errcode = '23514', message = 'An active commitment is required for new payments';
  end if;
  select coalesce(sum(amount_minor), 0) into scheduled from public.payments
    where budget_item_id = new.budget_item_id and id <> new.id;
  if scheduled + new.amount_minor > item.committed_amount_minor then
    raise exception using errcode = '23514', message = 'Scheduled payments exceed the active commitment';
  end if;
  return new;
end;
$$;

create trigger budget_items_protect_canonical before insert or update or delete on public.budget_items
  for each row execute function public.protect_budget_item();
create trigger couple_vendors_protect_financial_history before update or delete on public.couple_vendors
  for each row execute function public.protect_vendor_financial_history();
create trigger couple_vendors_sync_booked_budget after insert or update of status, agreed_price_minor on public.couple_vendors
  for each row execute function public.sync_booked_vendor_budget_item();
create trigger payments_validate_schedule before insert or update or delete on public.payments
  for each row execute function public.validate_payment_schedule();
comment on column public.budget_items.source is
  'manual expenses are independent; booked_vendor items retain canonical identity and payment history through lifecycle changes.';
commit;
