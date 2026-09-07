// Real PostgreSQL, isolated Docker network, no host ports or credentials.
// Run: node tests/database/task-status-postgres.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const name = `ever-after-task-status-${process.pid}`;
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const sql = (text, database = "postgres") => execFileSync("docker", ["exec", "-i", name, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database, "-At"], { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const migration = readFileSync("supabase/migrations/202609070001_task_waiting_on_vendor.sql", "utf8");
try {
  docker("run", "--detach", "--name", name, "--network", "none", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17");
  let ready = false;
  for (let i = 0; i < 40; i++) { try { docker("exec", name, "pg_isready", "-U", "postgres"); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); } }
  assert.ok(ready, "PostgreSQL must become ready");
  console.log("PostgreSQL version:", sql("show server_version;"));
  // Auth boundary stub only; complete repository public schema is executed intact.
  sql("create schema auth; create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');");
  sql(readFileSync("supabase/migrations/202609020001_initial_schema.sql", "utf8"));
  sql(`insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','synthetic@example.invalid');
    insert into tasks(wedding_id,title,status,notes,due_date) select id,s::text,s::task_status,'SYNTHETIC NOTE','2026-09-07' from weddings cross join unnest(array['open','in_progress','completed']) s;
    create table task_before as select * from tasks;`);
  sql(migration);
  const order = sql("select string_agg(enumlabel,',' order by enumsortorder) from pg_enum where enumtypid='public.task_status'::regtype;");
  assert.equal(order, "open,in_progress,waiting_on_vendor,completed");
  assert.equal(sql("select count(*) from ((select * from tasks except select * from task_before) union all (select * from task_before except select * from tasks)) d;"), "0");
  sql("insert into tasks(wedding_id,title,status) select id,'Waiting fixture','waiting_on_vendor' from weddings;");
  assert.equal(sql("select count(*) from tasks where status <> 'completed';"), "3");
  sql("update tasks set status='completed' where title='Waiting fixture'; update tasks set status='open' where title='Waiting fixture'; update tasks set status='waiting_on_vendor' where title='Waiting fixture';");
  assert.equal(sql("select status from tasks where title='Waiting fixture';"), "waiting_on_vendor");
  sql(migration); // IF NOT EXISTS replay is harmless.
  assert.equal(sql("select count(*) from tasks;"), "4");
  assert.throws(() => sql("insert into tasks(wedding_id,title,status) select id,'Invalid','overdue' from weddings;"), /invalid input value for enum/);
  // Separate pre-change type: rollback the exact addition before it is committed.
  sql("create database task_rollback;");
  sql("create type public.task_status as enum ('open','in_progress','completed');", "task_rollback");
  assert.throws(() => sql(`begin;\n${migration}\nselect 1/0;\ncommit;`, "task_rollback"), /division by zero/);
  assert.equal(sql("select string_agg(enumlabel,',' order by enumsortorder) from pg_enum where enumtypid='public.task_status'::regtype;", "task_rollback"), "open,in_progress,completed");
  // PostgreSQL forbids using a newly added enum value until its DDL commits.
  assert.throws(() => sql(`begin;\n${migration}\nselect 'waiting_on_vendor'::public.task_status;\ncommit;`, "task_rollback"), /unsafe use of new value/);
  console.log("PASS: exact migration, preserved rows, ordering, CRUD/query compatibility, replay, invalid overdue, rollback, enum commit boundary.");
  console.log("Public task schema is real; Supabase Auth and RLS integration are not exercised by this test.");
} finally {
  try { docker("rm", "--force", "--volumes", name); console.log("Disposable container and volume removed."); } catch (error) { console.error("Cleanup needs attention:", name); throw error; }
}
