// Public presentation fixture: no session, credentials or database access.
export async function getCurrentProfile() { return null; }
export function redirect(): never { throw new Error("Unexpected redirect in public fixture"); }
export function useSearchParams() { return new URLSearchParams(window.location.search); }
