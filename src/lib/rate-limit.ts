type Bucket = { n: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Simple fixed-window limiter (best-effort; single-node friendly). */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now >= cur.resetAt) {
    buckets.set(key, { n: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (cur.n >= max) {
    return { ok: false, retryAfterMs: Math.max(1000, cur.resetAt - now) };
  }
  cur.n += 1;
  return { ok: true, retryAfterMs: 0 };
}

export function clientIpFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
