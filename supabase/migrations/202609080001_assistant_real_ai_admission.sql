-- Future real-provider admission only. LOCAL/ISOLATED until separately approved.
-- Unapplied migration, revised in Phase 1B. No credential/login/provider is created.
begin;

create table public.assistant_real_ai_admissions (
  request_id uuid primary key,
  -- Immutable accounting identities, intentionally no cascading product FKs.
  -- Ownership is verified against live profiles/weddings at admission.
  couple_id uuid not null,
  wedding_id uuid not null,
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  state text not null default 'admitted'
    check (state in ('admitted', 'dispatched', 'completed', 'failed', 'uncertain')),
  admitted_at timestamptz not null default clock_timestamp(),
  dispatched_at timestamptz,
  completed_at timestamptz,
  outcome_code text check (outcome_code in ('SUCCEEDED', 'PRE_DISPATCH_FAILED', 'PROVIDER_FAILED', 'EXECUTION_UNCERTAIN')),
  constraint assistant_admission_lifecycle check ((
    (state = 'admitted' and dispatched_at is null and completed_at is null and outcome_code is null)
    or (state = 'dispatched' and dispatched_at is not null and completed_at is null and outcome_code is null)
    or (state = 'completed' and dispatched_at is not null and completed_at is not null and outcome_code = 'SUCCEEDED')
    or (state = 'failed' and completed_at is not null and
      ((dispatched_at is null and outcome_code = 'PRE_DISPATCH_FAILED')
       or (dispatched_at is not null and outcome_code = 'PROVIDER_FAILED')))
    or (state = 'uncertain' and dispatched_at is not null and completed_at is not null and outcome_code = 'EXECUTION_UNCERTAIN')
  ) is true),
  check (dispatched_at is null or dispatched_at >= admitted_at),
  check (completed_at is null or completed_at >= coalesce(dispatched_at, admitted_at))
);
create index assistant_admissions_couple_idx on public.assistant_real_ai_admissions(couple_id);
create unique index assistant_admissions_one_active_idx on public.assistant_real_ai_admissions(couple_id)
  where state in ('admitted', 'dispatched');
alter table public.assistant_real_ai_admissions enable row level security;
-- No owner-access policies: this is accounting, not Couple-editable content.
revoke all on public.assistant_real_ai_admissions from public, anon, authenticated, service_role;

create function public.admit_assistant_real_ai_turn(p_request_id uuid, p_couple_id uuid, p_wedding_id uuid, p_request_digest text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  previous public.assistant_real_ai_admissions%rowtype;
begin
  -- At READ COMMITTED each SQL statement after the lock sees the latest commits.
  -- Reject stale-snapshot isolation rather than allowing count/insert write skew.
  if current_setting('transaction_isolation') <> 'read committed' then
    return jsonb_build_object('status', 'rejected', 'code', 'UNSUPPORTED_TRANSACTION');
  end if;
  if p_request_id is null or p_couple_id is null or p_wedding_id is null
    or p_request_digest is null or p_request_digest !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'rejected', 'code', 'INVALID_INPUT');
  end if;
  -- Caller identity MUST originate from the future authenticated server boundary.
  -- Browser roles cannot execute this function, even with a legitimate wedding ID.
  if not exists (select 1 from public.profiles p join public.weddings w on w.owner_user_id = p.id
    where p.id = p_couple_id and p.role = 'couple' and w.id = p_wedding_id) then
    return jsonb_build_object('status', 'rejected', 'code', 'NOT_AUTHORIZED');
  end if;

  perform pg_advisory_xact_lock(20260908, 500);
  select * into previous from public.assistant_real_ai_admissions where request_id = p_request_id;
  if found then
    if previous.couple_id <> p_couple_id or previous.wedding_id <> p_wedding_id or previous.request_digest <> p_request_digest then
      return jsonb_build_object('status', 'rejected', 'code', 'REQUEST_CONFLICT');
    end if;
    -- Existing never means permission to dispatch again, regardless of its state.
    return jsonb_build_object('status', 'existing', 'requestId', previous.request_id, 'state', previous.state);
  end if;

  -- Every admitted row counts permanently, including failures/uncertain outcomes.
  if (select count(*) from public.assistant_real_ai_admissions) >= 500 then
    return jsonb_build_object('status', 'rejected', 'code', 'GLOBAL_QUOTA_EXHAUSTED');
  end if;
  if (select count(*) from public.assistant_real_ai_admissions where couple_id = p_couple_id) >= 150 then
    return jsonb_build_object('status', 'rejected', 'code', 'COUPLE_QUOTA_EXHAUSTED');
  end if;
  if exists (select 1 from public.assistant_real_ai_admissions
    where couple_id = p_couple_id and state in ('admitted', 'dispatched')) then
    return jsonb_build_object('status', 'rejected', 'code', 'REQUEST_ACTIVE');
  end if;
  insert into public.assistant_real_ai_admissions(request_id, couple_id, wedding_id, request_digest)
    values (p_request_id, p_couple_id, p_wedding_id, p_request_digest);
  return jsonb_build_object('status', 'admitted', 'requestId', p_request_id, 'state', 'admitted');
end;
$$;

create function public.claim_assistant_real_ai_dispatch(p_request_id uuid, p_couple_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  -- Atomic compare-and-set. Only the caller receiving this committed success may dispatch.
  update public.assistant_real_ai_admissions set state = 'dispatched', dispatched_at = clock_timestamp()
    where request_id = p_request_id and couple_id = p_couple_id and state = 'admitted';
  if not found then return jsonb_build_object('status', 'rejected', 'code', 'INVALID_TRANSITION'); end if;
  return jsonb_build_object('status', 'dispatch_claimed', 'requestId', p_request_id, 'state', 'dispatched');
end;
$$;

create function public.finish_assistant_real_ai_turn(p_request_id uuid, p_couple_id uuid, p_outcome_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare final_state text;
begin
  if p_outcome_code is null or p_outcome_code not in ('SUCCEEDED', 'PRE_DISPATCH_FAILED', 'PROVIDER_FAILED', 'EXECUTION_UNCERTAIN') then
    return jsonb_build_object('status', 'rejected', 'code', 'INVALID_INPUT');
  end if;
  final_state := case p_outcome_code when 'SUCCEEDED' then 'completed' when 'EXECUTION_UNCERTAIN' then 'uncertain' else 'failed' end;
  update public.assistant_real_ai_admissions
    set state = final_state, outcome_code = p_outcome_code,
      completed_at = clock_timestamp()
    where request_id = p_request_id and couple_id = p_couple_id
      and state = case when p_outcome_code = 'PRE_DISPATCH_FAILED' then 'admitted' else 'dispatched' end;
  if not found then return jsonb_build_object('status', 'rejected', 'code', 'INVALID_TRANSITION'); end if;
  -- Terminal uncertain releases the active slot, NEVER its consumed quota unit.
  -- No refund, redispatch, automatic retry or reopening operation exists.
  return jsonb_build_object('status', 'finished', 'requestId', p_request_id, 'state', final_state);
end;
$$;

revoke all on function public.admit_assistant_real_ai_turn(uuid, uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.claim_assistant_real_ai_dispatch(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.finish_assistant_real_ai_turn(uuid, uuid, text) from public, anon, authenticated, service_role;
-- Only the trusted server channel may call these RPCs. BYPASSRLS does not bypass
-- table ACLs: service_role still has no direct access to this ledger.
grant usage on schema public to service_role;
grant execute on function public.admit_assistant_real_ai_turn(uuid, uuid, uuid, text) to service_role;
grant execute on function public.claim_assistant_real_ai_dispatch(uuid, uuid) to service_role;
grant execute on function public.finish_assistant_real_ai_turn(uuid, uuid, text) to service_role;
commit;
