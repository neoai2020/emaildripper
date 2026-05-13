import { z } from "zod";

import type { getServiceSupabase } from "@/lib/db";

export type CampaignCloneDraft = {
  name: string;
  sourceLabel: string | null;
  autoresponderId: string;
  emailsText: string;
  timeWindowHours: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTz: string;
  maxConcurrentPerTick: number;
};

type Sb = NonNullable<ReturnType<typeof getServiceSupabase>>;

function hm(t: string | null | undefined, fallback: string) {
  if (!t) return fallback;
  const s = String(t).trim();
  return s.length >= 5 ? s.slice(0, 5) : fallback;
}

export async function loadCampaignCloneDraft(
  sb: Sb,
  cloneId: string,
): Promise<{ draft: CampaignCloneDraft; sourceName: string } | null> {
  const id = z.string().uuid().safeParse(cloneId.trim());
  if (!id.success) return null;

  const { data: c, error } = await sb.from("campaigns").select("*").eq("id", id.data).maybeSingle();
  if (error || !c) return null;

  const { data: leads, error: lErr } = await sb
    .from("campaign_leads")
    .select("email")
    .eq("campaign_id", id.data)
    .order("scheduled_at", { ascending: true })
    .limit(5000);
  if (lErr) return null;

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const row of leads ?? []) {
    const raw = String((row as { email?: string }).email ?? "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(raw);
  }

  const baseName = String(c.name ?? "Campaign").trim() || "Campaign";
  const name = `${baseName} (copy)`.slice(0, 200);

  const draft: CampaignCloneDraft = {
    name,
    sourceLabel: (c.source_label as string | null) ?? null,
    autoresponderId: String(c.autoresponder_id ?? ""),
    emailsText: ordered.join("\n"),
    timeWindowHours: Number.isFinite(Number(c.time_window_hours)) ? Number(c.time_window_hours) : 48,
    quietHoursEnabled: Boolean(c.quiet_hours_enabled),
    quietHoursStart: hm(c.quiet_hours_start as string | null, "01:00"),
    quietHoursEnd: hm(c.quiet_hours_end as string | null, "06:00"),
    quietHoursTz: String(c.quiet_hours_tz ?? "Europe/Vienna").trim() || "Europe/Vienna",
    maxConcurrentPerTick: Math.min(
      10,
      Math.max(1, Math.round(Number(c.max_concurrent_per_tick ?? 3))),
    ),
  };

  if (!z.string().uuid().safeParse(draft.autoresponderId).success) return null;

  return { draft, sourceName: baseName };
}
