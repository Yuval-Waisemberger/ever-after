export type WeddingSetupCompletionInput = {
  venueStatus: string | null;
  venueName: string | null;
  guestCount: number | null;
  preferredArea: string | null;
  eventType: string | null;
  styles: readonly string[];
  priorities: readonly string[];
};

/**
 * Date, budget and pre-booked categories are intentionally optional. A setup is
 * complete once the couple has answered the planning preferences that power the
 * rest of the workspace.
 */
export function isWeddingSetupComplete(value: WeddingSetupCompletionInput) {
  return Boolean(
    (value.venueStatus !== "booked" || value.venueName) &&
      value.guestCount &&
      value.preferredArea &&
      value.eventType &&
      value.styles.length > 0 &&
      value.priorities.length > 0,
  );
}

/** Untouched accounts start not_started; explicit Skip/partial saves are skipped. */
export function weddingSetupStatus(value: WeddingSetupCompletionInput): "completed" | "skipped" {
  return isWeddingSetupComplete(value) ? "completed" : "skipped";
}
