"use server";

import { countSendsPerArToday, effectiveDailySendCap, utcDayStartIso } from "@/lib/autoresponder-caps";
import { requireServiceSupabase } from "@/lib/db";
export type DashboardSnapshot = {
  metrics: {
    activeCount: number;
    sentToday: number;
    failed24h: number;
    lastTickAt: string | null;
    lastSuccessfulTickAt: string | null;
    makeOpsEstimate: string;
    makeOpsLimit: string | null;
  };
  activeCampaigns: {
    id: string;
    name: string;
    tag: string;
    status: string;
    total: number;
    sent: number;
    failed: number;
  }[];
  arUsage: { id: string; name: string; sentToday: number; cap: number | null }[];
  recentFailures: { email: string; campaign_id: string; error_message: string | null }[];
  tickGaps: { at: string; gapSec: number }[];
};

const GAP_WARN_SEC = 180;

export async function getDashboardSnapshotAction(): Promise<DashboardSnapshot | null> {
  try {
    const sb = requireServiceSupabase();
    const now = new Date();
    const dayStart = utcDayStartIso(now);

    const [{ count: ac }, { count: st }, { count: fl24 }, { data: tick }, { data: settings }, { count: s30 }] =
      await Promise.all([
        sb.from("campaigns").select("id", { count: "exact", head: true }).in("status", ["running", "scheduled", "paused"]),
        sb
          .from("campaign_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("sent_at", dayStart),
        sb
          .from("campaign_lead_logs")
          .select("id", { count: "exact", head: true })
          .eq("outcome", "failure")
          .gte("attempted_at", new Date(Date.now() - 24 * 3600_000).toISOString()),
        sb.from("tick_log").select("at").order("at", { ascending: false }).limit(1).maybeSingle(),
        sb
          .from("settings")
          .select("make_ops_monthly_limit,last_successful_tick_at")
          .eq("id", 1)
          .maybeSingle(),
        sb
          .from("campaign_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("sent_at", new Date(Date.now() - 30 * 24 * 3600_000).toISOString()),
      ]);

    const rawLimit = settings?.make_ops_monthly_limit;
    const makeOpsLimit = rawLimit != null && Number.isFinite(Number(rawLimit)) ? String(rawLimit) : null;
    const sentLast30d = s30 ?? 0;
    const makeOpsEstimate = String(sentLast30d * 2);

    const { data: camps } = await sb
      .from("campaigns")
      .select("id,name,tag,status,total_leads,sent_count,failed_count")
      .in("status", ["running", "scheduled", "paused"])
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: ars } = await sb.from("autoresponders").select("id,name,daily_cap,warmup_enabled,warmup_started_at,warmup_curve").eq("is_active", true);
    const arSentToday = await countSendsPerArToday(sb, dayStart);
    const arUsage =
      ars?.map((ar) => ({
        id: ar.id as string,
        name: ar.name as string,
        sentToday: arSentToday.get(ar.id as string) ?? 0,
        cap: effectiveDailySendCap(ar as never, now),
      })) ?? [];

    const { data: fails } = await sb
      .from("campaign_leads")
      .select("email,campaign_id,error_message")
      .eq("status", "failed")
      .order("id", { ascending: false })
      .limit(20);

    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: ticks24 } = await sb
      .from("tick_log")
      .select("at")
      .gte("at", since24)
      .order("at", { ascending: true })
      .limit(200);

    const tickGaps: { at: string; gapSec: number }[] = [];
    const arr = (ticks24 ?? []).map((r) => new Date(r.at as string).getTime());
    for (let i = 1; i < arr.length; i++) {
      const gapSec = Math.round((arr[i]! - arr[i - 1]!) / 1000);
      tickGaps.push({ at: new Date(arr[i]!).toISOString(), gapSec });
    }

    return {
      metrics: {
        activeCount: ac ?? 0,
        sentToday: st ?? 0,
        failed24h: fl24 ?? 0,
        lastTickAt: (tick?.at as string | null) ?? null,
        lastSuccessfulTickAt: (settings?.last_successful_tick_at as string | null) ?? null,
        makeOpsEstimate,
        makeOpsLimit,
      },
      activeCampaigns: (camps ?? []).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        tag: c.tag as string,
        status: c.status as string,
        total: Number(c.total_leads ?? 0),
        sent: Number(c.sent_count ?? 0),
        failed: Number(c.failed_count ?? 0),
      })),
      arUsage,
      recentFailures: (fails ?? []).map((r) => ({
        email: r.email as string,
        campaign_id: r.campaign_id as string,
        error_message: (r.error_message as string | null) ?? null,
      })),
      tickGaps: tickGaps.slice(-48),
    };
  } catch {
    return null;
  }
}
