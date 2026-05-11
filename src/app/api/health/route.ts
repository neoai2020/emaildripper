import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const [{ data: tick, error: tickErr }, { data: settings, error: setErr }] = await Promise.all([
    sb.from("tick_log").select("at, leads_processed, errors, duration_ms").order("at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("settings").select("worker_dead_after_minutes,last_successful_tick_at").eq("id", 1).maybeSingle(),
  ]);

  if (tickErr) {
    return NextResponse.json({ ok: false, error: tickErr.message }, { status: 500 });
  }
  if (setErr) {
    return NextResponse.json({ ok: false, error: setErr.message }, { status: 500 });
  }

  const deadAfterMin = Number(settings?.worker_dead_after_minutes ?? 5);
  const lastSuccessIso = settings?.last_successful_tick_at as string | null | undefined;
  const lastSuccessMs = lastSuccessIso ? new Date(lastSuccessIso).getTime() : null;
  const lastAttemptMs = tick?.at ? new Date(tick.at as string).getTime() : null;
  const refMs =
    lastSuccessMs != null && Number.isFinite(lastSuccessMs)
      ? lastSuccessMs
      : lastAttemptMs != null && Number.isFinite(lastAttemptMs)
        ? lastAttemptMs
        : null;
  const stale =
    refMs != null && Number.isFinite(refMs) ? Date.now() - refMs > deadAfterMin * 60_000 : false;

  const body = {
    ok: !stale,
    configured: true,
    stale,
    worker_dead_after_minutes: deadAfterMin,
    last_tick: tick ?? null,
    last_successful_tick_at: lastSuccessIso ?? null,
  };

  if (stale) {
    return NextResponse.json(body, { status: 503 });
  }
  return NextResponse.json(body);
}
