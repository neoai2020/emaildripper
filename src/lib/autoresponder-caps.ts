import type { SupabaseClient } from "@supabase/supabase-js";

export type ArCapRow = {
  id: string;
  daily_cap: number | null;
  warmup_enabled: boolean;
  warmup_started_at: string | null;
  warmup_curve: unknown;
};

/** UTC calendar day start for daily caps. */
export function utcDayStartIso(d = new Date()): string {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

function warmupDailyLimit(ar: ArCapRow, now: Date): number | null {
  if (!ar.warmup_enabled || !ar.warmup_started_at) return null;
  const started = new Date(ar.warmup_started_at).getTime();
  if (Number.isNaN(started)) return null;
  const dayIdx = Math.max(0, Math.floor((now.getTime() - started) / 86_400_000));
  const cap = ar.daily_cap ?? 10_000;

  const curve = ar.warmup_curve;
  if (Array.isArray(curve) && curve.length > 0) {
    const v = curve[Math.min(dayIdx, curve.length - 1)];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return Math.min(cap, Math.max(1, Math.round(n)));
  }
  if (curve && typeof curve === "object" && !Array.isArray(curve)) {
    const o = curve as Record<string, unknown>;
    const rampDays = Number(o.ramp_days ?? 7);
    const start = Number(o.start_cap ?? 30);
    const end = Number(o.end_cap ?? cap);
    if (Number.isFinite(rampDays) && rampDays > 0 && Number.isFinite(start) && Number.isFinite(end)) {
      const t = Math.min(1, dayIdx / rampDays);
      return Math.min(cap, Math.max(1, Math.round(start + t * (end - start))));
    }
  }

  const ramp = Math.min(cap, 40 * (dayIdx + 1));
  return Math.max(1, ramp);
}

/** Effective max sends for this AR for the current UTC day (warmup ∩ daily_cap). */
export function effectiveDailySendCap(ar: ArCapRow, now: Date): number | null {
  const warm = warmupDailyLimit(ar, now);
  if (ar.daily_cap == null && warm == null) return null;
  if (ar.daily_cap == null) return warm;
  if (warm == null) return Math.max(1, ar.daily_cap);
  return Math.max(1, Math.min(ar.daily_cap, warm));
}

export async function countSendsPerArToday(
  sb: SupabaseClient,
  sinceIso: string
): Promise<Map<string, number>> {
  const { data: leads, error } = await sb
    .from("campaign_leads")
    .select("campaign_id")
    .eq("status", "sent")
    .not("sent_at", "is", null)
    .gte("sent_at", sinceIso);
  if (error || !leads?.length) return new Map();

  const campIds = Array.from(new Set(leads.map((r) => r.campaign_id as string)));
  const { data: camps, error: cErr } = await sb.from("campaigns").select("id,autoresponder_id").in("id", campIds);
  if (cErr || !camps?.length) return new Map();

  const campToAr = new Map(camps.map((c) => [c.id as string, c.autoresponder_id as string]));
  const out = new Map<string, number>();
  for (const row of leads) {
    const aid = campToAr.get(row.campaign_id as string);
    if (!aid) continue;
    out.set(aid, (out.get(aid) ?? 0) + 1);
  }
  return out;
}
