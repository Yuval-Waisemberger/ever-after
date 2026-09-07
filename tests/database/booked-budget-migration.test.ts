import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202609050003_booked_vendor_budget_sync.sql", "utf8");
const fn = (name: string) => sql.split(`create function public.${name}()`)[1]?.split("$$;")[0] ?? "";
const sync = fn("sync_booked_vendor_budget_item");
const guard = fn("protect_budget_item");
const payments = fn("validate_payment_schedule");

describe("050003 migration contracts — source inspection, not PostgreSQL execution", () => {
  it("is an atomic first application with locked preflight and explicit partial-object refusal", () => {
    expect(sql).toMatch(/begin;\s*lock table/);
    expect(sql.trim()).toMatch(/commit;$/);
    expect(sql).toContain("objects already exist; inspect prior/partial application");
    for (const reason of ["duplicate linked budget", "ownership/reference inconsistency", "ambiguous legacy linked item"]) expect(sql).toContain(reason);
    expect(sql.indexOf("having count(*) > 1")).toBeLessThan(sql.indexOf("create unique index"));
    expect(sql).toContain("c.wedding_id <> b.wedding_id");
    expect(sql).toContain("num_nonnulls(c.vendor_id, c.external_vendor_id) <> 1");
  });
  it("adopts unique matching legacy links without rewriting estimate or payment values", () => {
    expect(sql).toContain("check (source in ('manual', 'booked_vendor'))");
    expect(sql).toContain("b.committed_amount_minor is distinct from c.agreed_price_minor");
    expect(sql).toContain("update public.budget_items set source = 'booked_vendor' where couple_vendor_id is not null;");
    expect(sql).toContain("where couple_vendor_id is not null;");
    expect(sql).toContain("and not exists (select 1 from public.budget_items b where b.couple_vendor_id = c.id)");
    expect(sql).not.toMatch(/(?:insert into|update|delete from) public\.payments/);
  });
  it("covers insert, quick/detail book, price added/changed/cleared, unbook and rebook in one trigger", () => {
    expect(sql).toContain("after insert or update of status, agreed_price_minor on public.couple_vendors");
    expect(sync).toContain("new.status = 'booked' and new.agreed_price_minor is not null");
    expect(sync).toContain("on conflict (couple_vendor_id) where couple_vendor_id is not null");
    expect(sync).toContain("do update set committed_amount_minor = excluded.committed_amount_minor;");
    expect(sync).toContain("set committed_amount_minor = null");
    expect(sync).not.toContain("delete");
    expect(sync).not.toContain("is_saved");
    expect(sync).toContain("public.vendor_profiles");
    expect(sync).toContain("public.external_vendors");
    expect(sync).not.toContain("estimated_amount_minor =");
  });
  it("protects canonical edits, detach, source and deletes with a non-client-spoofable internal path", () => {
    for (const text of ["new.source is distinct from old.source", "new.couple_vendor_id is distinct from old.couple_vendor_id", "new.committed_amount_minor is distinct from old.committed_amount_minor", "old.source = 'booked_vendor'", "new.wedding_id <> old.wedding_id"]) expect(guard).toContain(text);
    expect(guard).toContain("current_user = pg_get_userbyid(p.proowner)");
    expect(guard).toContain("pg_trigger_depth() > 1");
    expect(guard).not.toContain("current_setting");
    expect(sql).toContain("revoke all on function public.sync_booked_vendor_budget_item() from public, anon, authenticated");
    expect(guard).toContain("coalesce(old.estimated_amount_minor, old.committed_amount_minor, 0)");
  });
  it("blocks relationship deletion/cascades with linked history but leaves empty placeholders removable", () => {
    const relationship = fn("protect_vendor_financial_history");
    expect(relationship).toContain("where couple_vendor_id = old.id");
    expect(relationship).toContain("change vendor lifecycle instead");
    expect(relationship).toContain("return old;");
    expect(sql).toContain("before update or delete on public.couple_vendors");
    expect(guard).toContain("select 1 from public.payments where budget_item_id = old.id");
  });
  it("serializes new payment obligations and preserves historical discrepancies", () => {
    expect(payments).toContain("for update;");
    expect(payments.indexOf("for update;")).toBeLessThan(payments.indexOf("sum(amount_minor)"));
    expect(payments).toContain("new.amount_minor <= old.amount_minor then return new");
    expect(payments).toContain("scheduled + new.amount_minor > item.committed_amount_minor");
    expect(payments).toContain("item.committed_amount_minor is null or item.committed_amount_minor <= 0");
    expect(payments).toContain("new.budget_item_id <> old.budget_item_id");
  });
});
