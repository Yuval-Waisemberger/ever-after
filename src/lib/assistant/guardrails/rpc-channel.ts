// Next rejects this dependency from Client Components. No browser/session client.
import "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdmissionChannel } from "./server";

/** Inject a dedicated server-only service-role client after separate configuration
 * approval. This phase does not construct a client, read a key or open a connection.
 * Each PostgREST RPC completes its own transaction before returning success. */
export function createAdmissionRpcChannel(client: Pick<SupabaseClient, "rpc">): AdmissionChannel {
  async function call(name: string, args: Record<string, string>) {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error("Admission unavailable");
    return data;
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

// Fail closed until a future approved phase supplies the privileged client.
// In particular, never fall back to the existing browser-key/user-session client.
export function getAdmissionChannel(): AdmissionChannel {
  throw new Error("Admission unavailable");
}
