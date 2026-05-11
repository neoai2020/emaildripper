import { NextResponse } from "next/server";

import { safeCompareToken } from "@/lib/make-webhook";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Digest emails are not sent; endpoint remains for old scheduler URLs (no-op). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.CRON_TOKEN ?? "";
  if (!expected || !safeCompareToken(token, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  if (!checkRateLimit(`digest:${ip}`, 20, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
  }

  return NextResponse.json({ ok: true, skipped: true, reason: "digest_emails_disabled" });
}
