// An in-memory, read-only PostgREST double. No network or actual Supabase records.
export type Row = Record<string, unknown>;
const collator = new Intl.Collator("en", { numeric: true });
export const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
export const owner = uuid(1);
export const otherOwner = uuid(2);
export const weddingId = uuid(10);
export const otherWedding = uuid(11);
export const vendorId = uuid(100);
export const vendorTwo = uuid(101);
export function wedding(overrides: Row = {}): Row {
  return { id: weddingId, owner_user_id: owner, wedding_date: "2026-12-01", guest_count: 250, preferred_area: "central_israel", event_type: "evening", styles: ["Romantic"], priorities: ["Photography"], total_budget_minor: 18000000, setup_status: "completed", venue_status: "booked", venue_name: "Our Venue", booked_categories: ["Venue"], partner_one_phone: "PRIVATE_SENTINEL", second_email: "PRIVATE_SENTINEL", avatar_storage_path: "PRIVATE_SENTINEL", ...overrides };
}
export function vendor(overrides: Row = {}): Row {
  return { id: vendorId, business_name: "Original Studio", is_public: true, category_id: uuid(200), subcategory_id: uuid(201), location_city: "Tel Aviv", service_areas: ["central_israel"], min_price_minor: 100000, max_price_minor: 200000, services: ["Stills"], styles: ["Romantic"], event_types: ["evening"], min_guest_capacity: 100, max_guest_capacity: 500, friday_available: true, phone: "PRIVATE_SENTINEL", email: "PRIVATE_SENTINEL", website_url: "PRIVATE_SENTINEL", description: "PRIVATE_SENTINEL", ...overrides };
}
export function task(value: number, overrides: Row = {}): Row {
  return { id: uuid(value), wedding_id: weddingId, title: `Task ${value}`, category: "Photography", due_date: "2026-09-08", status: "open", priority: "medium", notes: "PRIVATE_SENTINEL", ...overrides };
}
export function expense(value: number, overrides: Row = {}): Row {
  return { id: uuid(value), wedding_id: weddingId, label: "Photographer", category: "Photography", estimated_amount_minor: 800000, committed_amount_minor: 1000000, notes: "PRIVATE_SENTINEL", ...overrides };
}
export function payment(value: number, overrides: Row = {}): Row {
  return { id: uuid(value), budget_item_id: uuid(300), label: "Deposit", amount_minor: 200000, due_date: "2026-09-08", is_paid: false, notes: "PRIVATE_SENTINEL", ...overrides };
}
export function relation(value: number, overrides: Row = {}): Row {
  return { id: uuid(value), wedding_id: weddingId, vendor_id: vendorId, external_vendor_id: null, status: "considering", is_saved: true, agreed_price_minor: 150000, private_notes: "PRIVATE_SENTINEL", contact_override: "PRIVATE_SENTINEL", ...overrides };
}
export function review(value: number, overrides: Row = {}): Row {
  return { id: uuid(value), vendor_id: vendorId, is_public: true, professionalism: 5, punctuality: 5, service_attitude: 5, value_for_money: 5, review_text: "PRIVATE_SENTINEL", reviewer_display_name: "PRIVATE_SENTINEL", ...overrides };
}
function at(row: Row, path: string): unknown { return path.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Row)[part] : undefined, row); }
export type Call = { table: string; selection?: string; operations: Array<[string, ...unknown[]]> };
export function database() {
  const state = {
    userId: owner as string | null, authError: false, tables: {} as Record<string, Row[]>, errors: new Set<string>(), nullResults: new Set<string>(), rejected: new Set<string>(), calls: [] as Call[], authCalls: 0,
  };
  state.tables = {
    profiles: [{ id: owner, role: "couple", phone: "PRIVATE_SENTINEL" }, { id: otherOwner, role: "couple" }],
    weddings: [wedding(), wedding({ id: otherWedding, owner_user_id: otherOwner, venue_name: "OTHER_COUPLE_SENTINEL" })],
    vendor_categories: [{ id: uuid(200), slug: "photography-content", name: "Photography & Content" }],
    vendor_subcategories: [{ id: uuid(201), slug: "photographers", name: "Photographers" }],
    vendor_profiles: [vendor(), vendor({ id: vendorTwo, business_name: "Second Studio" })],
    external_vendors: [], tasks: [], budget_items: [], payments: [], reviews: [], couple_vendors: [], guests: [],
  };
  function hydrate(table: string, row: Row): Row {
    const find = (table: string, id: unknown) => state.tables[table]?.find((item) => item.id === id) ?? null;
    if (table === "vendor_profiles" || table === "external_vendors") return { ...row, vendor_categories: find("vendor_categories", row.category_id), vendor_subcategories: find("vendor_subcategories", row.subcategory_id) };
    if (table === "payments") return { ...row, budget_items: find("budget_items", row.budget_item_id) };
    if (table === "couple_vendors") {
      const publicVendor = find("vendor_profiles", row.vendor_id); const external = find("external_vendors", row.external_vendor_id);
      return { ...row, vendor_profiles: publicVendor ? hydrate("vendor_profiles", publicVendor) : null, external_vendors: external ? hydrate("external_vendors", external) : null };
    }
    return row;
  }
  function from(table: string) {
    const call: Call = { table, operations: [] }; state.calls.push(call);
    const filters: Array<(row: Row) => boolean> = [];
    const orders: Array<{ field: string; nullsFirst: boolean; ascending: boolean }> = [];
    let start = 0; let end = Infinity; let single = false;
    const filter = (name: string, column: string, value: unknown, test: (actual: unknown) => boolean) => { call.operations.push([name, column, value]); filters.push((row) => test(at(row, column))); return chain; };
    function read() {
      if (state.rejected.has(table)) return Promise.reject(new Error("PRIVATE_SENTINEL"));
      if (state.errors.has(table)) return Promise.resolve({ data: [], error: { message: "PRIVATE_SENTINEL" } });
      if (state.nullResults.has(table)) return Promise.resolve({ data: null, error: null });
      let found = (state.tables[table] ?? []).map((row) => hydrate(table, row)).filter((row) => filters.every((match) => match(row)));
      found = found.toSorted((a, b) => {
        for (const order of orders) {
          const left = at(a, order.field); const right = at(b, order.field);
          if (left === right) continue;
          if (left == null) return order.nullsFirst ? -1 : 1;
          if (right == null) return order.nullsFirst ? 1 : -1;
          return collator.compare(String(left), String(right)) * (order.ascending ? 1 : -1);
        }
        return 0;
      }).slice(start, end + 1);
      return Promise.resolve({ data: single ? found[0] ?? null : found, error: null });
    }
    const chain = {
      select(selection: string) { call.selection = selection; return chain; },
      eq(column: string, value: unknown) { return filter("eq", column, value, (actual) => actual === value); },
      neq(column: string, value: unknown) { return filter("neq", column, value, (actual) => actual !== value); },
      lt(column: string, value: string | number) { return filter("lt", column, value, (actual) => actual != null && (actual as string | number) < value); },
      lte(column: string, value: string | number) { return filter("lte", column, value, (actual) => actual != null && (actual as string | number) <= value); },
      gte(column: string, value: string | number) { return filter("gte", column, value, (actual) => actual != null && (actual as string | number) >= value); },
      is(column: string, value: unknown) { return filter("is", column, value, (actual) => actual === value); },
      not(column: string, operator: string, value: unknown) { return filter("not", column, value, (actual) => operator === "is" && actual !== value); },
      in(column: string, values: unknown[]) { return filter("in", column, values, (actual) => values.includes(actual)); },
      overlaps(column: string, values: unknown[]) { return filter("overlaps", column, values, (actual) => Array.isArray(actual) && values.some((value) => actual.includes(value))); },
      contains(column: string, values: unknown[]) { return filter("contains", column, values, (actual) => Array.isArray(actual) && values.every((value) => actual.includes(value))); },
      ilike(column: string, value: string) { return filter("ilike", column, value, (actual) => typeof actual === "string" && actual.toLowerCase() === value.replace(/\\(.)/g, "$1").toLowerCase()); },
      or(expression: string) {
        call.operations.push(["or", expression]);
        const terms = [...expression.matchAll(/(?:^|,)(business_name|location_city)\.ilike\."((?:\\.|[^"])*)"/g)];
        filters.push((row) => terms.some((term) => String(row[term[1]] ?? "").toLowerCase().includes(term[2].slice(1, -1).replace(/\\(.)/g, "$1").toLowerCase())));
        return chain;
      },
      order(field: string, options: { nullsFirst?: boolean; ascending?: boolean } = {}) { orders.push({ field, nullsFirst: options.nullsFirst ?? false, ascending: options.ascending ?? true }); call.operations.push(["order", field]); return chain; },
      range(a: number, b: number) { start = a; end = b; call.operations.push(["range", a, b]); return chain; },
      limit(value: number) { end = value - 1; call.operations.push(["limit", value]); return chain; },
      maybeSingle() { single = true; return read(); }, single() { single = true; return read(); },
      then(resolve: (value: { data: unknown; error: unknown }) => unknown, reject?: (reason: unknown) => unknown) { return read().then(resolve, reject); },
    };
    return chain;
  }
  return { state, client: { from, auth: { getUser: async () => { state.authCalls++; return { data: { user: state.userId ? { id: state.userId, email: "PRIVATE_SENTINEL" } : null }, error: state.authError ? new Error("PRIVATE_SENTINEL") : null }; } } } };
}
