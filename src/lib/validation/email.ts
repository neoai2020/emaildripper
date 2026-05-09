/** RFC 5322 simplified — good enough for lead intake pre-checks. */
const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmailSyntax(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}
