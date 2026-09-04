/** Return an application-relative path, never an external URL. */
export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value || value.length > 2048) return fallback;
  let decoded = value;
  // Inspect nested encodings too; return the original spelling only after validation.
  for (let depth = 0; depth < 6; depth++) {
    if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/u.test(decoded)) return fallback;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        // URL normalization also catches dot-segment paths that become //host.
        const parsed = new URL(value, "https://internal.invalid");
        if (parsed.origin !== "https://internal.invalid" || parsed.pathname.startsWith("//")) return fallback;
        return value;
      }
      decoded = next;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Trusted deployment configuration, never a user-supplied Host/Origin header. */
export function signupCallbackUrl(audience: "couple" | "vendor"): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) throw new Error("App origin is not configured.");
  const origin = new URL(configured);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("App origin must be an HTTP(S) origin.");
  }
  const callback = new URL("/auth/callback", origin.origin);
  callback.searchParams.set("audience", audience);
  return callback.toString();
}
