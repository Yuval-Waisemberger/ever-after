import { createClient } from "@/lib/supabase/server";
import { calculateGuestSummary, GUEST_RSVP_STATUSES, GUEST_SIDES, type GuestRsvpStatus, type GuestSide } from "@/lib/domain/guests";
import { getOwnedWedding } from "./wedding";

export const GUESTS_PER_PAGE = 50;

export type GuestRow = {
  id: string;
  full_name: string;
  party_name: string | null;
  guest_group: string | null;
  side: GuestSide | null;
  phone: string | null;
  email: string | null;
  rsvp_status: GuestRsvpStatus;
  invited_count: number;
  attending_count: number | null;
  dietary_notes: string | null;
  private_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestListFilters = {
  search?: string;
  rsvp?: GuestRsvpStatus;
  group?: string;
  side?: GuestSide;
  page?: number;
};

function quotedPostgrestPattern(value: string) {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `"%${escaped}%"`;
}

async function getGuestSummaryRows(weddingId: string) {
  const supabase = await createClient();
  const rows: Array<{ rsvp_status: GuestRsvpStatus; invited_count: number; attending_count: number | null; guest_group: string | null }> = [];
  const batchSize = 1000;

  for (let from = 0; ; from += batchSize) {
    const { data, error } = await supabase
      .from("guests")
      .select("rsvp_status, invited_count, attending_count, guest_group")
      .eq("wedding_id", weddingId)
      .order("id", { ascending: true })
      .range(from, from + batchSize - 1);
    if (error) throw new Error("Guest List summary could not be loaded.");
    const batch = (data ?? []) as typeof rows;
    rows.push(...batch);
    if (batch.length < batchSize) break;
  }
  return rows;
}

export async function getGuestSummary() {
  const wedding = await getOwnedWedding();
  const rows = await getGuestSummaryRows(wedding.id);
  return calculateGuestSummary(rows.map((row) => ({
    rsvpStatus: row.rsvp_status,
    invitedCount: row.invited_count,
    attendingCount: row.attending_count,
  })));
}

export async function getGuestList(filters: GuestListFilters = {}) {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const from = (page - 1) * GUESTS_PER_PAGE;

  let query = supabase
    .from("guests")
    .select("id, full_name, party_name, guest_group, side, phone, email, rsvp_status, invited_count, attending_count, dietary_notes, private_notes, created_at, updated_at", { count: "exact" })
    .eq("wedding_id", wedding.id);

  const search = filters.search?.trim().slice(0, 120);
  if (search) {
    const pattern = quotedPostgrestPattern(search);
    query = query.or(`full_name.ilike.${pattern},party_name.ilike.${pattern}`);
  }
  if (filters.rsvp && GUEST_RSVP_STATUSES.includes(filters.rsvp)) query = query.eq("rsvp_status", filters.rsvp);
  if (filters.group) query = query.eq("guest_group", filters.group.slice(0, 80));
  if (filters.side && GUEST_SIDES.includes(filters.side)) query = query.eq("side", filters.side);

  const { data, error, count } = await query
    .order("full_name", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, from + GUESTS_PER_PAGE - 1);
  if (error) throw new Error("Guest List could not be loaded.");

  const summaryRows = await getGuestSummaryRows(wedding.id);
  const groups = [...new Set(summaryRows
    .map((row) => row.guest_group)
    .filter((group): group is string => Boolean(group))
  )].toSorted((a, b) => a.localeCompare(b));

  return {
    wedding,
    guests: (data ?? []) as GuestRow[],
    total: count ?? 0,
    page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / GUESTS_PER_PAGE)),
    summary: calculateGuestSummary(summaryRows.map((row) => ({ rsvpStatus: row.rsvp_status, invitedCount: row.invited_count, attendingCount: row.attending_count }))),
    groups,
  };
}

export async function getOwnedGuest(id: string) {
  const wedding = await getOwnedWedding();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guests")
    .select("id, full_name, party_name, guest_group, side, phone, email, rsvp_status, invited_count, attending_count, dietary_notes, private_notes, created_at, updated_at")
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .maybeSingle();
  if (error) throw new Error("Guest details could not be loaded.");
  return data as GuestRow | null;
}
