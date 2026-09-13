export type ProtectedAccessFailureCode =
  | "auth_unavailable"
  | "profile_unavailable"
  | "profile_integrity"
  | "owned_wedding_unavailable"
  | "owned_wedding_missing";

export class ProtectedAccessError extends Error {
  readonly retryable: boolean;

  constructor(readonly code: ProtectedAccessFailureCode) {
    super("Protected access could not be resolved.");
    this.name = "ProtectedAccessError";
    this.retryable =
      code === "auth_unavailable" ||
      code === "profile_unavailable" ||
      code === "owned_wedding_unavailable";
  }
}

export function isProtectedAccessError(
  error: unknown,
): error is ProtectedAccessError {
  return error instanceof ProtectedAccessError;
}

export function protectedAccessMessage(error: ProtectedAccessError) {
  if (error.retryable) {
    return "We could not verify access right now. Please try again.";
  }

  return "We could not verify this account's setup. Please try again later or contact support.";
}

export function protectedAccessActionState(error: unknown) {
  if (!isProtectedAccessError(error)) {
    return null;
  }

  return {
    status: "error" as const,
    message: protectedAccessMessage(error),
  };
}

export async function resolveActionAccess<T>(load: () => Promise<T>) {
  try {
    return { ok: true as const, value: await load() };
  } catch (error) {
    const state = protectedAccessActionState(error);
    if (!state) throw error;
    return { ok: false as const, state };
  }
}
