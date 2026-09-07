// Executes actual repository schema/policies/triggers as non-owner PostgreSQL roles.
// Supabase Auth JWT and Storage HTTP are NOT emulated: only their SQL boundary is stubbed.
// node tests/database/security-rls-postgres.mjs -- uses existing local image, no network/ports.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const name = `ever-after-security-${process.pid}`;
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const sql = text => execFileSync("docker", ["exec", "-i", name, "psql", "-XqAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres"], { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const uid = n => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000001`;
const A = uid(1), B = uid(2), V = uid(3), W = uid(4);
const as = (user, statement, rollback = false) => sql(`begin; set local role ${user ? "authenticated" : "anon"}; set local "request.jwt.claim.sub" = '${user ?? ""}'; ${statement}; ${rollback ? "rollback" : "commit"};`);
let assertions = 0;
const equal = (actual, expected) => { assert.equal(actual, expected); assertions++; };
const deny = (user, statement, pattern = /row-level security|permission denied|cannot be changed|cannot be moved|managed from vendor|protected|foreign key|created by the database/) => {
  assert.throws(() => as(user, statement), error => pattern.test(String(error.stderr))); assertions++;
};
const migrationPath = "supabase/migrations/202609070002_role_boundary_hardening.sql";
const migration = readFileSync(migrationPath, "utf8");
try {
  docker("run", "--pull=never", "--detach", "--name", name, "--network", "none", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17");
  let ready = false;
  for (let i = 0; i < 40; i++) { try { docker("exec", name, "pg_isready", "-U", "postgres"); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); } }
  assert.ok(ready);
  console.log("PostgreSQL", sql("show server_version"));
  sql(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated; grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  for (const file of readdirSync("supabase/migrations").filter(f => f.endsWith(".sql") && f < "202609070002").sort()) sql(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const [user, role] of [[A, "couple"], [B, "couple"], [V, "vendor"], [W, "vendor"]]) sql(`insert into auth.users(id,email,raw_user_meta_data) values ('${user}','synthetic-${role}@example.invalid','{"role":"${role}","business_name":"Synthetic studio"}');`);
  const wa = sql(`select id from weddings where owner_user_id='${A}'`), wb = sql(`select id from weddings where owner_user_id='${B}'`);
  const va = sql(`select id from vendor_profiles where owner_user_id='${V}'`), vb = sql(`select id from vendor_profiles where owner_user_id='${W}'`);
  sql(`update vendor_profiles set is_public=true where id='${va}';`);

  // Prove the original gaps, rolled back immediately in the disposable database.
  equal(as(V, `insert into weddings(owner_user_id,partner_one_name,partner_two_name) values ('${V}','A','B'); select count(*) from weddings where owner_user_id='${V}'`, true), "1");
  equal(as(A, `insert into vendor_profiles(owner_user_id,slug,business_name) values ('${A}','wrong-role','Wrong role'); select count(*) from vendor_profiles where owner_user_id='${A}'`, true), "1");
  equal(as(A, `insert into couple_vendors(wedding_id,vendor_id,status,agreed_price_minor) values ('${wa}','${vb}','booked',100); select label from budget_items where wedding_id='${wa}'`, true), "Synthetic studio");
  sql(`insert into couple_vendors(wedding_id,vendor_id) values ('${wa}','${va}');`);
  equal(as(V, `delete from vendor_profiles where id='${va}'; select count(*) from vendor_profiles where id='${va}'`, true), "0");
  sql(`delete from couple_vendors;`);
  console.log("PASS: reproduced role creation, private vendor sync disclosure and cross-role cascade gaps before fix (all isolated).");

  const originalHelper = sql("select prosrc from pg_proc where oid='public.owns_wedding(uuid)'::regprocedure");
  assert.throws(() => sql(migration.replace(/commit;\s*$/, "select 1/0; commit;")), error => /division by zero/.test(String(error.stderr)));
  equal(sql("select prosrc from pg_proc where oid='public.owns_wedding(uuid)'::regprocedure"), originalHelper);
  equal(sql("select count(*) from pg_policies where policyname='weddings_couple_role'"), "0");
  const snapshot = () => sql(`select md5(string_agg(t::text,'' order by t::text)) from (select to_jsonb(w) t from weddings w union all select to_jsonb(v) from vendor_profiles v union all select to_jsonb(p) from profiles p) s`);
  const before = snapshot(); sql(migration); equal(snapshot(), before);
  deny(V, `insert into weddings(owner_user_id,partner_one_name,partner_two_name) values ('${V}','A','B')`);
  deny(A, `insert into vendor_profiles(owner_user_id,slug,business_name) values ('${A}','wrong-role','Wrong role')`);
  deny(A, `update profiles set role='vendor' where id='${A}'`);
  // Legitimate explicit creation and automatic signup remain possible.
  equal(as(A, `delete from weddings where id='${wa}'; insert into weddings(id,owner_user_id,partner_one_name,partner_two_name) values ('${wa}','${A}','A','B'); select count(*) from weddings`, true), "1");
  equal(as(W, `delete from vendor_profiles where id='${vb}'; insert into vendor_profiles(id,owner_user_id,slug,business_name) values ('${vb}','${W}','new-private','Private'); select count(*) from vendor_profiles where owner_user_id='${W}'`, true), "1");
  sql(`insert into auth.users(id,email) values ('${uid(5)}','new-couple@example.invalid');`);
  equal(sql(`select count(*) from weddings where owner_user_id='${uid(5)}'`), "1");
  deny(A, `insert into couple_vendors(wedding_id,vendor_id,status,agreed_price_minor) values ('${wa}','${vb}','booked',100)`);

  const fixture = (user, wedding, n) => {
    const ids = { task: uid(n), guest: uid(n+1), external: uid(n+2), relation: uid(n+3), thread: uid(n+4), message: uid(n+5), payment: uid(n+6) };
    as(user, `insert into tasks(id,wedding_id,title,status) values ('${ids.task}','${wedding}','Private task','waiting_on_vendor');
      insert into guests(id,wedding_id,full_name) values ('${ids.guest}','${wedding}','Synthetic private guest');
      insert into external_vendors(id,wedding_id,business_name) values ('${ids.external}','${wedding}','Synthetic private supplier');
      insert into couple_vendors(id,wedding_id,external_vendor_id,status,agreed_price_minor) values ('${ids.relation}','${wedding}','${ids.external}','booked',10000);
      insert into assistant_threads(id,wedding_id) values ('${ids.thread}','${wedding}');
      insert into assistant_messages(id,thread_id,role,content) values ('${ids.message}','${ids.thread}','user','Private message');
      insert into payments(id,budget_item_id,label,amount_minor) select '${ids.payment}',id,'Payment',2000 from budget_items where couple_vendor_id='${ids.relation}';
      insert into storage.objects(bucket_id,name) values ('couple-media','${user}/avatar.jpg');`);
    ids.budget = sql(`select id from budget_items where couple_vendor_id='${ids.relation}'`);
    return ids;
  };
  const a = fixture(A, wa, 100), b = fixture(B, wb, 200);
  // Defense in depth for a wrong-role wedding created before this patch.
  sql(`insert into weddings(id,owner_user_id,partner_one_name,partner_two_name) values ('${uid(900)}','${V}','Legacy','Wrong role');
    insert into tasks(wedding_id,title) values ('${uid(900)}','Wrong-role legacy task');
    insert into budget_items(id,wedding_id,label,committed_amount_minor) values ('${uid(901)}','${uid(900)}','Legacy',1000);
    insert into payments(budget_item_id,label,amount_minor) values ('${uid(901)}','Legacy',100);
    insert into assistant_threads(id,wedding_id) values ('${uid(902)}','${uid(900)}');
    insert into assistant_messages(thread_id,role,content) values ('${uid(902)}','user','Legacy');`);
  equal(as(V, `select public.owns_wedding('${uid(900)}'),public.owns_budget_item('${uid(901)}'),public.owns_assistant_thread('${uid(902)}')`), "f|f|f");
  const rows = [
    ["weddings", wa, wb, "partner_one_name='Changed'", "owner_user_id", B],
    ["tasks", a.task,b.task,"status='completed'","wedding_id",wb],
    ["guests",a.guest,b.guest,"full_name='Changed'","wedding_id",wb],
    ["external_vendors",a.external,b.external,"business_name='Changed'","wedding_id",wb],
    ["couple_vendors",a.relation,b.relation,"status='considering'","wedding_id",wb],
    ["budget_items",a.budget,b.budget,"label='Changed'","wedding_id",wb],
    ["payments",a.payment,b.payment,"label='Changed'","budget_item_id",b.budget],
    ["assistant_threads",a.thread,b.thread,"title='Changed'","wedding_id",wb],
    ["assistant_messages",a.message,b.message,"content='Changed'","thread_id",b.thread],
  ];
  for (const [table, own, other, patch, parent, foreignParent] of rows) {
    equal(as(A, `select count(*) from ${table} where id='${own}'`), "1");
    equal(as(A, `select count(*) from ${table} where id='${other}'`), "0");
    equal(as(B, `select count(*) from ${table} where id='${own}'`), "0");
    equal(as(A, `with changed as (update ${table} set ${patch} where id='${other}' returning id) select count(*) from changed`), "0");
    equal(as(A, `with changed as (delete from ${table} where id='${other}' returning id) select count(*) from changed`), "0");
    deny(A, `update ${table} set ${parent}='${foreignParent}' where id='${own}'`);
    equal(as(V, `select count(*) from ${table}`), "0");
    equal(as(V, `with changed as (update ${table} set ${patch} where id='${own}' returning id) select count(*) from changed`), "0");
    equal(as(V, `with changed as (delete from ${table} where id='${own}' returning id) select count(*) from changed`), "0");
    deny(null, `select * from ${table}`);
    deny(null, `update ${table} set ${patch} where id='${own}'`);
  }
  for (const user of [A,V,null]) {
    deny(user, `insert into tasks(wedding_id,title) values ('${wb}','Forged')`);
    deny(user, `insert into guests(wedding_id,full_name) values ('${wb}','Forged')`);
    deny(user, `insert into external_vendors(wedding_id,business_name) values ('${wb}','Forged')`);
    deny(user, `insert into couple_vendors(wedding_id,vendor_id) values ('${wb}','${va}')`);
    deny(user, `insert into assistant_threads(wedding_id) values ('${wb}')`);
    deny(user, `insert into assistant_messages(thread_id,role,content) values ('${b.thread}','user','Forged')`);
    deny(user, `insert into budget_items(wedding_id,label,committed_amount_minor) values ('${wb}','Forged',100)`);
    deny(user, `insert into payments(budget_item_id,label,amount_minor) values ('${b.budget}','Forged',100)`, /unavailable|row-level security|permission denied/);
  }
  deny(A, `insert into couple_vendors(wedding_id,external_vendor_id) values ('${wa}','${b.external}')`);
  deny(A, `update budget_items set couple_vendor_id='${b.relation}' where id='${a.budget}'`);
  for (const patch of ["source='manual', couple_vendor_id=null", "committed_amount_minor=999", "couple_vendor_id=null"]) deny(A, `update budget_items set ${patch} where id='${a.budget}'`);
  deny(A, `delete from budget_items where id='${a.budget}'`);
  deny(A, `delete from couple_vendors where id='${a.relation}'`);
  deny(A, `delete from external_vendors where id='${a.external}'`);
  deny(A, `insert into payments(budget_item_id,label,amount_minor) values ('${a.budget}','Too much',9000)`, /exceed/);
  as(A, `update couple_vendors set status='considering' where id='${a.relation}'`);
  equal(as(A, `select committed_amount_minor is null from budget_items where id='${a.budget}'`), "t");
  equal(as(A, `select amount_minor from payments where id='${a.payment}'`), "2000");
  as(A, `update couple_vendors set status='booked',agreed_price_minor=12000 where id='${a.relation}'`);
  equal(as(A, `select committed_amount_minor from budget_items where id='${a.budget}'`), "12000");

  // Vendor owner changes do not claim public/other private businesses.
  equal(as(V, `select count(*) from vendor_profiles where id='${vb}'`), "0");
  equal(as(W, `with changed as (update vendor_profiles set owner_user_id='${W}' where id='${va}' returning id) select count(*) from changed`), "0");
  deny(V, `update vendor_profiles set owner_user_id='${A}' where id='${va}'`);
  as(V, `update vendor_profiles set business_name='Updated by owner' where id='${va}'`);
  equal(as(null, `select business_name from vendor_profiles`), "Updated by owner");
  deny(null, `update vendor_profiles set business_name='Forged' where id='${va}'`);
  as(A, `insert into couple_vendors(wedding_id,vendor_id,status,agreed_price_minor) values ('${wa}','${va}','booked',10000)`);
  deny(V, `delete from vendor_profiles where id='${va}'`);
  as(V, `update vendor_profiles set is_public=false where id='${va}'`);
  as(A, `update couple_vendors set status='considering' where wedding_id='${wa}' and vendor_id='${va}'`);
  as(V, `update vendor_profiles set is_public=true where id='${va}'`);
  as(A, `insert into reviews(vendor_id,wedding_id,reviewer_display_name,professionalism,punctuality,service_attitude,value_for_money,would_choose_again) values ('${va}','${wa}','Synthetic',5,5,5,5,true)`);
  equal(as(V, `with changed as (delete from reviews where wedding_id='${wa}' returning id) select count(*) from changed`), "0");
  equal(as(null, "select count(*) from reviews"), "1");
  // A review alone also protects its author's history from Vendor deletion.
  sql(`insert into reviews(vendor_id,wedding_id,reviewer_display_name,professionalism,punctuality,service_attitude,value_for_money,would_choose_again) values ('${vb}','${wa}','Synthetic',5,5,5,5,true)`);
  deny(W, `delete from vendor_profiles where id='${vb}'`);
  as(V, `insert into vendor_images(vendor_id,storage_path) values ('${va}','${va}/image.jpg')`);
  deny(W, `insert into vendor_images(vendor_id,storage_path) values ('${va}','${va}/forged.jpg')`);
  deny(V, `update vendor_images set vendor_id='${vb}' where vendor_id='${va}'`);
  equal(as(W, `with changed as (delete from vendor_images where vendor_id='${va}' returning id) select count(*) from changed`), "0");

  // Storage policy semantics (not Storage API signed URL integration).
  equal(as(A, "select count(*) from storage.objects where bucket_id='couple-media'"), "1");
  equal(as(V, "select count(*) from storage.objects where bucket_id='couple-media'"), "0");
  equal(as(null, "select count(*) from storage.objects where bucket_id='couple-media'"), "0");
  for (const user of [A,V,null]) deny(user, `insert into storage.objects(bucket_id,name) values ('couple-media','${B}/forged.jpg')`);
  equal(as(A, `with changed as (delete from storage.objects where name='${B}/avatar.jpg' returning id) select count(*) from changed`), "0");
  deny(A, `update storage.objects set name='${B}/stolen.jpg' where name='${A}/avatar.jpg'`);
  as(V, `insert into storage.objects(bucket_id,name) values ('vendor-media','${va}/image.jpg')`);
  for (const user of [A,W,null]) deny(user, `insert into storage.objects(bucket_id,name) values ('vendor-media','${va}/forged.jpg')`);
  deny(V, `update storage.objects set name='${vb}/stolen.jpg' where name='${va}/image.jpg'`);
  equal(as(W, `with changed as (delete from storage.objects where name='${va}/image.jpg' returning id) select count(*) from changed`), "0");
  equal(as(null, "select count(*) from storage.objects where bucket_id='vendor-media'"), "1");
  as(V, `delete from storage.objects where name='${va}/image.jpg'`);
  equal(as(A, "select public.can_manage_couple_media('../x'), public.can_manage_couple_media('invalid/x')"), "f|f");
  equal(sql("select confdeltype from pg_constraint where conname='couple_vendors_vendor_id_fkey'"), "r");
  equal(sql("select confdeltype from pg_constraint where conname='reviews_vendor_id_fkey'"), "r");
  console.log(`PASS: ${assertions} assertions; exact migration/rollback, role guards, A/B isolation, reassignment, canonical/payment triggers, public boundaries and Storage SQL policies.`);
  console.log("No Frankfurt connection; full Supabase JWT/PostgREST/Storage HTTP integration remains separate.");
} finally {
  docker("rm", "--force", "--volumes", name);
  console.log("Disposable container and volume removed.");
}
