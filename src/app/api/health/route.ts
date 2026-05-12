import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/db";

export const dynamic = "force-dynamic";

function levelFromAgeSec(sec: number | null): "ok" | "warn" | "error" {
  if (sec == null || !Number.isFinite(sec)) return "error";
  if (sec <= 90) return "ok";
  if (sec <= 300) return "warn";
  return "error";
}

export async function GET() {
  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        level: "error" as const,
        seconds_since_success: null,
        seconds_since_tick_attempt: null,
        last_tick: null,
        last_successful_tick_at: null,
      },
      { status: 200 }
    );
  }

  const [{ data: tick, error: tickErr }, { data: settings, error: setErr }] = await Promise.all([
    sb.from("tick_log").select("at, leads_processed, errors, duration_ms").order("at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("settings").select("worker_dead_after_minutes,last_successful_tick_at").eq("id", 1).maybeSingle(),
  ]);

  if (tickErr) {
    return NextResponse.json({ ok: false, configured: true, error: tickErr.message }, { status: 500 });
  }
  if (setErr) {
    return NextResponse.json({ ok: false, configured: true, error: setErr.message }, { status: 500 });
  }

  const now = Date.now();
  const lastSuccessIso = settings?.last_successful_tick_at as string | null | undefined;
  const lastSuccessMs = lastSuccessIso ? new Date(lastSuccessIso).getTime() : null;
  const lastAttemptMs = tick?.at ? new Date(tick.at as string).getTime() : null;

  const secSuccess = lastSuccessMs != null && Number.isFinite(lastSuccessMs) ? Math.round((now - lastSuccessMs) / 1000) : null;
  const secAttempt = lastAttemptMs != null && Number.isFinite(lastAttemptMs) ? Math.round((now - lastAttemptMs) / 1000) : null;

  const refForLevel = secSuccess != null ? secSuccess : secAttempt;
  const level = levelFromAgeSec(refForLevel);

  const deadAfterMin = Number(settings?.worker_dead_after_minutes ?? 5);
  const stale = refForLevel != null && refForLevel > deadAfterMin * 60;

  const body = {
    ok: !stale,
    configured: true,
    stale,
    level,
    worker_dead_after_minutes: deadAfterMin,
    seconds_since_success: secSuccess,
    seconds_since_tick_attempt: secAttempt,
    last_tick: tick ?? null,
    last_successful_tick_at: lastSuccessIso ?? null,
  };

  return NextResponse.json(body, { status: 200 });
}
