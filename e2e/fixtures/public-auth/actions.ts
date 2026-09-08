import type { AuthActionState } from "@/lib/actions/auth-state";

// Isolated promise control: tests settle a mock result explicitly, with no timers or network.
let resolveAction: ((state: AuthActionState) => void) | undefined;
export function finishAction() {
  resolveAction?.({ status: "error", message: "Please check your email and password and try again." });
  resolveAction = undefined;
}
export async function signIn(): Promise<AuthActionState> {
  return new Promise(resolve => { resolveAction = resolve; });
}
export const signUpCouple = signIn;
export const signUpVendor = signIn;
export const resendVerification = signIn;
