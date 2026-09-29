/** Only same-site relative paths are followed after sign-in (open-redirect protection). */
export const safeReturn = (value: string | null, fallback: string) =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;

/** E2 client hint only; the BE enforces the policy (≥12, upper, digit, special, blocklist). */
export const meetsPasswordHint = (p: string) => p.length >= 12 && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
