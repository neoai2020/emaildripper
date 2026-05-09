import { promises as dns } from "node:dns";

const cache = new Map<string, { ok: boolean; at: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

export async function hasMxRecords(domain: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(domain);
  if (hit && now - hit.at < TTL_MS) return hit.ok;
  try {
    const mx = await dns.resolveMx(domain);
    const ok = Array.isArray(mx) && mx.length > 0;
    cache.set(domain, { ok, at: now });
    return ok;
  } catch {
    cache.set(domain, { ok: false, at: now });
    return false;
  }
}

export async function validateEmailMx(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  return hasMxRecords(domain);
}
