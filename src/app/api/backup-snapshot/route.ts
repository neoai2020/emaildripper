import { NextResponse } from "next/server";

import { createBackupSnapshotCore } from "@/lib/backup-snapshot";
import { requireServiceSupabase } from "@/lib/db";
import { safeCompareToken } from "@/lib/make-webhook";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.CRON_TOKEN ?? "";
  if (!expected || !safeCompareToken(token, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`backup_list:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limit" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const sb = requireServiceSupabase();
  const { data: days, error: dErr } = await sb.storage.from("app-backups").list("snapshots", {
    limit: 40,
    sortBy: { column: "name", order: "desc" },
  });
  if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });

  const entries: { path: string; name: string; created_at?: string | null }[] = [];
  for (const d of days ?? []) {
    if (!d.name) continue;
    const prefix = `snapshots/${d.name}`;
    const { data: objs, error: oErr } = await sb.storage.from("app-backups").list(prefix, {
      limit: 50,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (oErr) continue;
    for (const o of objs ?? []) {
      if (o.name) entries.push({ path: `${prefix}/${o.name}`, name: o.name, created_at: o.created_at ?? null });
    }
  }
  entries.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

  return NextResponse.json({ ok: true, files: entries.slice(0, 50) });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.CRON_TOKEN ?? "";
  if (!expected || !safeCompareToken(token, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`backup:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limit" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  try {
    const { path, bytes } = await createBackupSnapshotCore();
    return NextResponse.json({ ok: true, path, bytes, gzip: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "backup_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
