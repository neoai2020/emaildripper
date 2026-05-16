/** Returns true when `tz` is accepted by the JS Intl timezone database. */
export function isValidIanaTimeZone(tz: string): boolean {
  const s = tz.trim();
  if (!s) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: s });
    return true;
  } catch {
    return false;
  }
}

export function assertValidIanaTimeZone(tz: string): void {
  if (!isValidIanaTimeZone(tz)) {
    throw new Error(`Invalid timezone "${tz}". Use an IANA name like Europe/Vienna or America/New_York.`);
  }
}
