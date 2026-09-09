// Next rejects this dependency from Client Components. No browser/session client.
import "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AdmissionChannel } from "./server";

/** Keep the dedicated service-role client private to this narrow RPC adapter.
 * Each PostgREST RPC completes its own transaction before returning success. */
export function createAdmissionRpcChannel(client: Pick<SupabaseClient, "rpc">): AdmissionChannel {
  async function call(name: string, args: Record<string, string>) {
    try {
      const { data, error } = await client.rpc(name, args);
      if (error) throw new Error("Admission unavailable");
      return data;
    } catch {
      // Includes transport exceptions; never propagate headers, keys or raw errors.
      throw new Error("Admission unavailable");
    }
  }
  return {
    admit: ({ requestId, coupleId, weddingId, digest }) => call("admit_assistant_real_ai_turn", {
      p_request_id: requestId, p_couple_id: coupleId, p_wedding_id: weddingId, p_request_digest: digest,
    }),
    claimDispatch: ({ requestId, coupleId }) => call("claim_assistant_real_ai_dispatch", {
      p_request_id: requestId, p_couple_id: coupleId,
    }),
    finish: ({ requestId, coupleId, outcome }) => call("finish_assistant_real_ai_turn", {
      p_request_id: requestId, p_couple_id: coupleId, p_outcome_code: outcome,
    }),
  };
}

const admissionConfig = z.object({
  url: z.url({ protocol: /^https$/ }).refine(value => {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
  }),
  key: z.string().trim().min(1).max(4096).regex(/^\S+$/),
});

// Lazy: importing this module or using Local never reads privileged configuration
// or constructs a client. No singleton, browser fallback or user-session cookies.
export function getAdmissionChannel(): AdmissionChannel {
  try {
    const { url, key } = admissionConfig.parse({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { retry: false },
    });
    return createAdmissionRpcChannel(client);
  } catch {
    // The execution boundary maps this fixed failure to ADMISSION_UNAVAILABLE.
    throw new Error("Admission unavailable");
  }
}
