import { NextResponse } from "next/server";
import { z } from "zod";

import { requireServiceSupabase } from "@/lib/db";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { validateEmailMx } from "@/lib/mx/lookup";
import { isValidEmailSyntax, normalizeEmail } from "@/lib/validation/email";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  emails: z.array(z.string()).max(5000),
});

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    if (!checkRateLimit(`leads_import:${ip}`, 40, 60_000).ok) {
      return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
    }

    const json = await req.json();
    const { emails: raw } = bodySchema.parse(json);

    const normalized = Array.from(
      new Set(raw.map((e) => normalizeEmail(String(e))).filter((e) => isValidEmailSyntax(e)))
    );

    const sb = requireServiceSupabase();
    const { data: suppressed } = await sb.from("suppression_list").select("email").in("email", normalized);
    const suppressedSet = new Set((suppressed ?? []).map((r) => r.email));

    let mxFail = 0;
    const mxOk: string[] = [];
    for (const e of normalized) {
      if (suppressedSet.has(e)) continue;
      // eslint-disable-next-line no-await-in-loop
      const ok = await validateEmailMx(e);
      if (ok) mxOk.push(e);
      else mxFail++;
    }

    return NextResponse.json({
      ok: true,
      total_input: raw.length,
      valid_syntax: normalized.length,
      mx_ok: mxOk.length,
      mx_fail: mxFail,
      suppressed: normalized.filter((e) => suppressedSet.has(e)).length,
      eligible: mxOk.length,
      sample_eligible: mxOk.slice(0, 10),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "invalid_request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
