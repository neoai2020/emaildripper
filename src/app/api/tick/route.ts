import { NextResponse } from "next/server";

import { runTick } from "@/lib/tick/runTick";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    return await runTick(req);
  } catch (e) {
    console.error("[api/tick]", e);
    const message = e instanceof Error ? e.message : "tick_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const POST = GET;
