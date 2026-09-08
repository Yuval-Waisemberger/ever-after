// Exact repository migrations, disposable PostgreSQL, existing image only.
// No network, published ports, credentials, seed or Frankfurt connection.
// node tests/database/assistant-admission-postgres.mjs
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const name = `ever-after-admission-${process.pid}`;
const migrationName = "202609080001_assistant_real_ai_admission.sql";
const migration = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const psqlArgs = ["exec", "-i", name, "psql", "-XqAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres"];
const sql = input => execFileSync("docker", psqlArgs, { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
// Separate psql processes/connections, not Promise-wrapped synchronous execution.
const asyncExec = promisify(execFile);
const asyncSql = async input => {
  // psql -c avoids stdin handling for asynchronous execFile.
  const { stdout } = await asyncExec("docker", [...psqlArgs, "-c", input], { encoding: "utf8" });
  return stdout.trim();
};
const uid = n => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000001`;
const digest = "a".repeat(64), otherDigest = "b".repeat(64);
const executor = "assistant_admission_executor";
const as = (statement, role = executor) => sql(`set session authorization ${role}; begin; ${statement}; commit;`);
const admission = (request, couple, fingerprint = digest, wedding = couple) => `select public.admit_assistant_real_ai_turn('${uid(request)}','${uid(couple)}','${uid(wedding)}','${fingerprint}')`;
const claim = (request, couple) => `select public.claim_assistant_real_ai_dispatch('${uid(request)}','${uid(couple)}')`;
const finish = (request, couple, outcome = "SUCCEEDED") => `select public.finish_assistant_real_ai_turn('${uid(request)}','${uid(couple)}','${outcome}')`;
const result = statement => JSON.parse(as(statement));
let assertions = 0, running = false;
const equal = (actual, expected) => { assert.deepEqual(actual, expected); assertions++; };
const denied = (statement, role) => {
  assert.throws(() => as(statement, role), error => /permission denied/.test(String(error.stderr))); assertions++;
};
const reset = () => sql("truncate public.assistant_real_ai_admissions"); // ONLY disposable fixture owner
const count = () => Number(sql("select count(*) from public.assistant_real_ai_admissions"));
const waitReady = async () => {
  for (let i = 0; i < 40; i++) {
    try { docker("exec", name, "pg_isready", "-U", "postgres"); return; }
    catch { await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  throw new Error("Disposable database did not become ready");
};
// Actually admit and safely fail each turn through the privileged functions.
// Ten requests per synthetic Couple avoids bypassing either approved limit.
function fillGlobal(amount) {
  as(`do $$ declare i int; c uuid; r uuid; answer jsonb; begin
    for i in 1..${amount} loop
      c := (lpad((((i-1)/10)+1)::text,8,'0') || '-0000-4000-8000-000000000001')::uuid;
      r := (lpad(i::text,8,'0') || '-0000-4000-8000-000000000001')::uuid;
      answer := public.admit_assistant_real_ai_turn(r,c,c,'${digest}');
      if answer->>'status' <> 'admitted' then raise exception 'Expected admission %', i; end if;
      answer := public.finish_assistant_real_ai_turn(r,c,'PRE_DISPATCH_FAILED');
      if answer->>'status' <> 'finished' then raise exception 'Expected safe terminal state'; end if;
    end loop;
  end $$`);
  assertions += amount * 2;
}
function fillCouple(start, amount, couple = 1) {
  as(`do $$ declare i int; r uuid; answer jsonb; begin
    for i in ${start}..${start + amount - 1} loop
      r := (lpad(i::text,8,'0') || '-0000-4000-8000-000000000001')::uuid;
      answer := public.admit_assistant_real_ai_turn(r,'${uid(couple)}','${uid(couple)}','${digest}');
      if answer->>'status' <> 'admitted' then raise exception 'Expected Couple admission %', i; end if;
      answer := public.finish_assistant_real_ai_turn(r,'${uid(couple)}','PRE_DISPATCH_FAILED');
      if answer->>'status' <> 'finished' then raise exception 'Expected safe terminal state'; end if;
    end loop;
  end $$`);
  assertions += amount * 2;
}

try {
  docker("run", "--pull=never", "--detach", "--name", name, "--network", "none", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17");
  running = true; await waitReady();
  console.log("PostgreSQL", sql("show server_version"));
  sql(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated; grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  for (const file of readdirSync("supabase/migrations").filter(f => f.endsWith(".sql") && f < migrationName).sort()) sql(readFileSync(`supabase/migrations/${file}`, "utf8"));
  sql(`insert into auth.users(id,email) select (lpad(i::text,8,'0')||'-0000-4000-8000-000000000001')::uuid,'fixture-'||i||'@example.invalid' from generate_series(1,60) i;
    update public.weddings set id=owner_user_id;
    insert into auth.users(id,email,raw_user_meta_data) values ('${uid(90)}','vendor@example.invalid','{"role":"vendor","business_name":"Fixture"}');`);
  const before = sql("select count(*) from public.weddings");
  assert.throws(() => sql(migration.replace(/commit;\s*$/, "select 1/0; commit;")), error => /division by zero/.test(String(error.stderr))); assertions++;
  equal(sql("select count(*) from pg_roles where rolname='assistant_admission_executor'"), "0");
  equal(sql("select to_regclass('public.assistant_real_ai_admissions') is null"), "t");
  sql(migration);
  equal(sql("select count(*) from public.weddings"), before);
  equal(count(), 0);

  // Actual grants, not only catalog/string assertions. Even service_role cannot use it.
  const direct = [
    "select * from public.assistant_real_ai_admissions",
    `insert into public.assistant_real_ai_admissions(request_id,couple_id,wedding_id,request_digest) values ('${uid(1)}','${uid(1)}','${uid(1)}','${digest}')`,
    "update public.assistant_real_ai_admissions set state='completed'",
    "delete from public.assistant_real_ai_admissions",
    "truncate public.assistant_real_ai_admissions",
  ];
  for (const role of ["anon", "authenticated", "service_role", executor]) for (const statement of direct) denied(statement, role);
  for (const role of ["anon", "authenticated", "service_role"]) {
    for (const statement of [admission(1,1), claim(1,1), finish(1,1)]) denied(statement, role);
    denied(`set role ${executor}`, role);
  }
  equal(sql("select relrowsecurity from pg_class where oid='public.assistant_real_ai_admissions'::regclass"), "t");
  equal(sql("select count(*) from pg_policies where tablename='assistant_real_ai_admissions'"), "0");
  equal(sql("select rolcanlogin or rolsuper or rolcreaterole or rolcreatedb or rolbypassrls or rolreplication from pg_roles where rolname='assistant_admission_executor'"), "f");
  equal(sql("select count(*) from pg_auth_members where roleid='assistant_admission_executor'::regrole"), "0");
  equal(sql("select count(*) from pg_constraint where conrelid='public.assistant_real_ai_admissions'::regclass and contype='f'"), "0");
  for (const statement of [admission(1,90), admission(1,1,digest,2), admission(1,99)]) equal(result(statement).code, "NOT_AUTHORIZED");
  equal(result(admission(1,1,"not-a-digest")).code, "INVALID_INPUT");
  equal(JSON.parse(as("select public.admit_assistant_real_ai_turn(null,null,null,null)")).code, "INVALID_INPUT");
  console.log("PASS: migration atomicity, live-owner checks, RLS and actual denied browser/service-role/table permissions.");

  // Global 1..499, then exactly #500; terminal failures retain their units.
  fillGlobal(499); equal(count(),499);
  equal(result(admission(500,50)).status,"admitted");
  equal(result(finish(500,50,"PRE_DISPATCH_FAILED")).status,"finished");
  equal(count(),500); equal(result(admission(501,51)).code,"GLOBAL_QUOTA_EXHAUSTED");
  equal(result(admission(500,50)).status,"existing"); equal(count(),500);
  equal(result(admission(500,50,otherDigest)).code,"REQUEST_CONFLICT");
  console.log("PASS: all 500 admissions through functions; #501 rejected, duplicate at exhaustion does not consume again.");

  // Several independent connections race for the final global slot.
  for (let race = 0; race < 2; race++) {
    reset(); fillGlobal(499);
    const answers = await Promise.all(Array.from({ length: 8 }, (_, i) => asyncSql(`begin; set local role ${executor}; ${admission(1000+i,51+i)}; commit;`).then(JSON.parse)));
    equal(answers.filter(r => r.status === "admitted").length,1);
    equal(answers.filter(r => r.code === "GLOBAL_QUOTA_EXHAUSTED").length,7);
    equal(count(),500);
  }
  // A stale repeatable-read snapshot is deliberately rejected.
  equal(JSON.parse(sql(`begin isolation level repeatable read; set local role ${executor}; ${admission(2000,60)}; commit;`)).code,"UNSUPPORTED_TRANSACTION");
  equal(JSON.parse(sql(`begin isolation level serializable; set local role ${executor}; ${admission(2000,60)}; commit;`)).code,"UNSUPPORTED_TRANSACTION");
  console.log("PASS: two eight-connection boundary races each admitted exactly one; stale-snapshot isolation rejected.");

  reset();
  // Move ONLY isolated fixture timestamps; no clock changes or client time inputs.
  for (let batch = 0; batch < 15; batch++) {
    if (batch) sql("update public.assistant_real_ai_admissions set admitted_at=clock_timestamp()-interval '6 minutes'");
    fillCouple(batch*10+1,10);
  }
  equal(count(),150); equal(result(admission(151,1)).code,"COUPLE_QUOTA_EXHAUSTED");
  sql(`insert into public.assistant_threads(id,wedding_id) values ('${uid(8000)}','${uid(1)}');
    insert into public.assistant_messages(thread_id,role,content) values ('${uid(8000)}','user','Disposable quota deletion fixture');`);
  sql(`begin; set local role authenticated; set local "request.jwt.claim.sub"='${uid(1)}';
    delete from public.assistant_messages where thread_id='${uid(8000)}';
    delete from public.assistant_threads where id='${uid(8000)}'; commit;`);
  equal(count(),150); equal(result(admission(151,1)).code,"COUPLE_QUOTA_EXHAUSTED");
  // The profile identity also prevents resetting a Couple cap by recreating its wedding.
  sql(`delete from public.weddings where id='${uid(1)}'; insert into public.weddings(id,owner_user_id,partner_one_name,partner_two_name) values ('${uid(1)}','${uid(1)}','A','B');`);
  docker("restart",name); await waitReady();
  equal(count(),150); equal(result(admission(151,1)).code,"COUPLE_QUOTA_EXHAUSTED");
  console.log("PASS: #150 accepted/#151 rejected across conversation deletion, wedding recreation, separate sessions and PostgreSQL restart.");

  reset(); fillCouple(1,10);
  equal(result(admission(11,1)).code,"RATE_LIMITED");
  // Sliding window: only the oldest expires, leaving nine recent admissions.
  sql(`update public.assistant_real_ai_admissions set admitted_at=clock_timestamp()-interval '5 minutes' where request_id='${uid(1)}'`);
  equal(result(admission(11,1)).status,"admitted");
  equal(result(finish(11,1,"PRE_DISPATCH_FAILED")).status,"finished");
  equal(result(admission(12,1)).code,"RATE_LIMITED");
  sql("update public.assistant_real_ai_admissions set admitted_at=clock_timestamp()-interval '6 minutes'");
  equal(result(admission(12,1)).status,"admitted");
  equal(count(),12);
  console.log("PASS: 10-per-sliding-five-minute limit, #11 rejected, expiration admits later turns without refunding usage.");

  reset();
  const identityRace = await Promise.all(Array.from({ length: 8 }, () => asyncSql(`begin; set local role ${executor}; ${admission(1,1)}; commit;`).then(JSON.parse)));
  equal(identityRace.filter(r => r.status === "admitted").length,1);
  equal(identityRace.filter(r => r.status === "existing").length,7); equal(count(),1);
  equal(result(admission(1,1,otherDigest)).code,"REQUEST_CONFLICT");
  equal(result(admission(1,2)).code,"REQUEST_CONFLICT");
  equal(result(admission(2,1)).code,"REQUEST_ACTIVE");
  equal(result(claim(1,2)).code,"INVALID_TRANSITION");
  const dispatchRace = await Promise.all(Array.from({ length: 8 }, () => asyncSql(`begin; set local role ${executor}; ${claim(1,1)}; commit;`).then(JSON.parse)));
  equal(dispatchRace.filter(r => r.status === "dispatch_claimed").length,1);
  equal(dispatchRace.filter(r => r.code === "INVALID_TRANSITION").length,7);
  equal(result(admission(2,1)).code,"REQUEST_ACTIVE");
  equal(result(finish(1,1,"PRE_DISPATCH_FAILED")).code,"INVALID_TRANSITION");
  equal(result(finish(1,1)).state,"completed");
  equal(result(admission(1,1)).state,"completed");
  equal(result(claim(1,1)).code,"INVALID_TRANSITION");
  equal(result(finish(1,1)).code,"INVALID_TRANSITION");
  equal(result(admission(2,1)).status,"admitted");
  equal(result(finish(2,1,"PRE_DISPATCH_FAILED")).state,"failed");
  equal(result(claim(2,1)).code,"INVALID_TRANSITION");
  equal(result(admission(2,1)).state,"failed");
  equal(result(admission(3,1)).status,"admitted"); equal(result(claim(3,1)).status,"dispatch_claimed");
  equal(result(finish(3,1,"PROVIDER_FAILED")).state,"failed"); equal(result(claim(3,1)).code,"INVALID_TRANSITION");
  equal(result(admission(4,1)).status,"admitted"); equal(result(claim(4,1)).status,"dispatch_claimed");
  equal(result(finish(4,1,"EXECUTION_UNCERTAIN")).state,"uncertain");
  equal(result(admission(4,1)).state,"uncertain");
  equal(result(admission(5,1)).code,"REQUEST_ACTIVE");
  equal(result(claim(4,1)).code,"INVALID_TRANSITION");
  equal(result(finish(4,1)).code,"INVALID_TRANSITION");
  equal(result(finish(4,1,"raw provider error")).code,"INVALID_INPUT"); equal(count(),4);
  equal(sql("select count(*) from public.assistant_real_ai_admissions where state='uncertain' and completed_at is null"),"1");
  console.log("PASS: concurrent idempotency/dispatch, conflicting identity, one active slot, completed/failed replay denial and uncertain fail-closed slot.");

  reset();
  const activeRace = await Promise.all(Array.from({ length: 6 }, (_, i) => asyncSql(`begin; set local role ${executor}; ${admission(i+1,1)}; commit;`).then(JSON.parse)));
  equal(activeRace.filter(r => r.status === "admitted").length,1);
  equal(activeRace.filter(r => r.code === "REQUEST_ACTIVE").length,5); equal(count(),1);
  assert.throws(() => sql("update public.assistant_real_ai_admissions set state='completed', dispatched_at=clock_timestamp(), completed_at=clock_timestamp(), outcome_code=null"), error => /check constraint/.test(String(error.stderr))); assertions++;
  reset();
  sql(`begin; set local role ${executor}; ${admission(1,1)}; rollback;`); equal(count(),0);
  equal(result(admission(1,1)).status,"admitted");
  sql(`begin; set local role ${executor}; ${claim(1,1)}; rollback;`);
  equal(result(claim(1,1)).status,"dispatch_claimed");
  console.log("PASS: distinct-request concurrency, lifecycle constraint and committed-transaction dispatch prerequisite.");
  console.log(`PASS: ${assertions} database assertions. Local-only; no external dispatch, network, seed or live database.`);
} finally {
  if (running) docker("rm","--force","--volumes",name);
  console.log("Disposable admission container/volume removed.");
}
