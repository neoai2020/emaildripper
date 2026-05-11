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

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export function signMakePayload(
  body: MakeLeadPayload,
  secret: string
): MakeLeadPayload & { signature: string } {
  const canonical = stableStringify(body);
  const signature = createHmac("sha256", secret).update(canonical).digest("hex");
  return { ...body, signature };
}

/** Recompute HMAC from payload fields (excludes `signature`) and compare in constant time. */
export function verifyMakePayloadSignature(
  received: MakeLeadPayload & { signature: string },
  secret: string
): boolean {
  const { signature, ...rest } = received;
  const expected = signMakePayload(rest, secret).signature;
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
