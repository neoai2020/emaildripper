import { createHmac, timingSafeEqual } from "node:crypto";

export type MakeLeadPayload = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  custom_fields: Record<string, unknown>;
  campaign_id: string;
  campaign_tag: string;
  lead_id: string;
  attempt: number;
  timestamp: string;
};

/** Separator between HMAC fields — plain pipe, no spaces (must match Make `concat` modules). */
export const MAKE_WEBHOOK_HMAC_SEP = "|";

/** Canonical string for Make.com HMAC: lead_id|campaign_id|email (fixed order; timestamp excluded). */
export function makeWebhookCanonicalString(body: MakeLeadPayload): string {
  return [body.lead_id, body.campaign_id, body.email].join(MAKE_WEBHOOK_HMAC_SEP);
}

export type SignedMakeLeadPayload = MakeLeadPayload & {
  /** Exact UTF-8 string that was HMAC-signed — hash this in Make instead of re-concatenating fields. */
  canonical: string;
  signature: string;
};

export function signMakePayload(body: MakeLeadPayload, secret: string): SignedMakeLeadPayload {
  const canonical = makeWebhookCanonicalString(body);
  const signature = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
  return { ...body, canonical, signature };
}

/** Recompute HMAC from payload fields (excludes `signature` / `canonical`) and compare in constant time. */
export function verifyMakePayloadSignature(
  received: SignedMakeLeadPayload,
  secret: string
): boolean {
  const { signature, email, first_name, last_name, custom_fields, campaign_id, campaign_tag, lead_id, attempt, timestamp } =
    received;
  const expected = signMakePayload(
    { email, first_name, last_name, custom_fields, campaign_id, campaign_tag, lead_id, attempt, timestamp },
    secret
  ).signature;
  return safeCompareToken(signature, expected);
}

export function safeCompareToken(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export const MAKE_WEBHOOK_POST_MS = 10_000;

export async function postSignedMakeLead(
  url: string,
  body: SignedMakeLeadPayload,
  timeoutMs = MAKE_WEBHOOK_POST_MS
): Promise<{ status: number; text: string }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const text = await res.text();
    return { status: res.status, text: text.slice(0, 500) };
  } catch {
    return { status: 0, text: "timeout_or_network_error" };
  } finally {
    clearTimeout(timer);
  }
}
