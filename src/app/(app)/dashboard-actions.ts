"use server";

import { countSendsPerArToday, effectiveDailySendCap, utcDayStartIso } from "@/lib/autoresponder-caps";
import { requireServiceSupabase } from "@/lib/db";

export type DashboardSnapshot = {
  metrics: {
    activeCount: number;
    leadsInFlight: number;
    sentToday: number;
    failed24h: number;
    lastTickAt: string | null;
    lastSuccessfulTickAt: string | null;
    maxTickGapMsLastHour: number | null;
    makeOpsEstimate: string;
    makeOpsLimit: string | null;
  };
  activeCampaigns: {
    id: string;
    name: string;
    tag: string;
    status: string;
    autoresponderName: string | null;
    total: number;
    sent: number;
    failed: number;
  }[];
  arUsage: { id: string; name: string; sentToday: number; cap: number | null }[];
  recentFailures: {
    attemptedAt: string;
    email: string;
    campaign_id: string;
    campaign_name: string | null;
    ar_name: string | null;
    error_message: string | null;
    http_status: number | null;
  }[];
  tickGaps: { at: string; gapSec: number }[];
  tickBuckets1h: { bucketLabel: string; bucketStartIso: string; hadTick: number }[];
};

export async function getDashboardSnapshotAction(): Promise<DashboardSnapshot | null> {
  try {
    const sb = requireServiceSupabase();
    const now = new Date();
    const dayStart = utcDayStartIso(now);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();

    const [
      { count: ac },
      { count: inflight },
      { count: st },
      { count: fl24 },
      { data: tick },
      { data: settings },
      { count: sentThisMonth },
    ] = await Promise.all([
      sb.from("campaigns").select("id", { count: "exact", head: true }).in("status", ["running", "scheduled", "paused"]),
      sb
        .from("campaign_leads")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "processing"]),
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
      sb.from("settings").select("make_ops_monthly_limit,last_successful_tick_at").eq("id", 1).maybeSingle(),
      sb
        .from("campaign_leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", monthStart),
    ]);

    const rawLimit = settings?.make_ops_monthly_limit;
    const makeOpsLimit = rawLimit != null && Number.isFinite(Number(rawLimit)) ? String(rawLimit) : null;
    const makeOpsEstimate = String((sentThisMonth ?? 0) * 2);

    const { data: camps } = await sb
      .from("campaigns")
      .select("id,name,tag,status,total_leads,sent_count,failed_count,autoresponder_id,autoresponders(name)")
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

    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();

    const { data: failLogs } = await sb
      .from("campaign_lead_logs")
      .select(
        "attempted_at,error_message,http_status,campaign_leads(email,campaign_id,campaigns(name,autoresponders(name)))"
      )
      .eq("outcome", "failure")
      .order("attempted_at", { ascending: false })
      .limit(10);

    const recentFailures = (failLogs ?? []).map((row) => {
      const cl = row.campaign_leads as {
        email?: string;
        campaign_id?: string;
        campaigns?: { name?: string; autoresponders?: { name?: string } | null } | null;
      } | null;
      const camp = cl?.campaigns;
      const arn = camp?.autoresponders?.name ?? null;
      return {
        attemptedAt: row.attempted_at as string,
        email: (cl?.email as string) ?? "—",
        campaign_id: (cl?.campaign_id as string) ?? "",
        campaign_name: camp?.name ?? null,
        ar_name: arn,
        error_message: (row.error_message as string | null) ?? null,
        http_status: (row.http_status as number | null) ?? null,
      };
    });
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

    const { data: ticks1h } = await sb
      .from("tick_log")
      .select("at")
      .gte("at", hourAgo)
      .order("at", { ascending: true })
      .limit(500);

    const tickMs = (ticks1h ?? []).map((r) => new Date(r.at as string).getTime());
    let maxTickGapMsLastHour: number | null = null;
    for (let i = 1; i < tickMs.length; i++) {
      const g = tickMs[i]! - tickMs[i - 1]!;
      if (maxTickGapMsLastHour == null || g > maxTickGapMsLastHour) maxTickGapMsLastHour = g;
    }

    const nowMs = Date.now();
    const floorMin = Math.floor(nowMs / 60_000);
    const tickSet = new Set(tickMs.map((t) => Math.floor(t / 60_000)));
    const tickBuckets1h: DashboardSnapshot["tickBuckets1h"] = [];
    for (let i = 59; i >= 0; i--) {
      const minuteIdx = floorMin - i;
      const start = minuteIdx * 60_000;
      tickBuckets1h.push({
        bucketLabel: `${new Date(start).getUTCHours().toString().padStart(2, "0")}:${new Date(start).getUTCMinutes().toString().padStart(2, "0")}`,
        bucketStartIso: new Date(start).toISOString(),
        hadTick: tickSet.has(minuteIdx) ? 1 : 0,
      });
    }

    return {
      metrics: {
        activeCount: ac ?? 0,
        leadsInFlight: inflight ?? 0,
        sentToday: st ?? 0,
        failed24h: fl24 ?? 0,
        lastTickAt: (tick?.at as string | null) ?? null,
        lastSuccessfulTickAt: (settings?.last_successful_tick_at as string | null) ?? null,
        maxTickGapMsLastHour,
        makeOpsEstimate,
        makeOpsLimit,
      },
      activeCampaigns: (camps ?? []).map((c) => {
        const ar = c.autoresponders as { name?: string } | null | undefined;
        return {
          id: c.id as string,
          name: c.name as string,
          tag: c.tag as string,
          status: c.status as string,
          autoresponderName: ar?.name ?? null,
          total: Number(c.total_leads ?? 0),
          sent: Number(c.sent_count ?? 0),
          failed: Number(c.failed_count ?? 0),
        };
      }),
      arUsage,
      recentFailures,
      tickGaps: tickGaps.slice(-48),
      tickBuckets1h,
    };
  } catch {
    return null;
  }
}
