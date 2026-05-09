import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const { data, error } = await sb
    .from("tick_log")
    .select("at, leads_processed, errors, duration_ms")
    .order("at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    last_tick: data ?? null,
  });
}
