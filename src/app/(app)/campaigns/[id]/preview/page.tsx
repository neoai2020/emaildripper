import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getServiceSupabase } from "@/lib/db";
import { cn } from "@/lib/utils";

import { CampaignPreviewClient, type HourlyRow } from "./campaign-preview-client";

function buildHourlyBuckets(
  startsAt: Date,
  scheduledIso: string[],
  windowHours: number
): HourlyRow[] {
  const bucketMs = 3600_000;
  const windowEnd = startsAt.getTime() + windowHours * bucketMs;
  const counts = new Map<number, number>();
  const maxIdx = Math.max(0, Math.ceil((windowEnd - startsAt.getTime()) / bucketMs));

  for (let i = 0; i <= maxIdx; i++) counts.set(i, 0);

  for (const iso of scheduledIso) {
    const t = new Date(iso).getTime();
    if (t < startsAt.getTime() || t > windowEnd) continue;
    const idx = Math.floor((t - startsAt.getTime()) / bucketMs);
    counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }

  const rows: HourlyRow[] = [];
  for (let i = 0; i <= maxIdx; i++) {
    rows.push({
      hour: `+${i}h`,
      sends: counts.get(i) ?? 0,
    });
  }
  return rows;
}

export default async function CampaignPreviewPage({ params }: { params: { id: string } }) {
  const sb = getServiceSupabase();
  if (!sb) {
    return (
      <PageHeader title="Pre-flight preview" description="Connect Supabase to load this preview." />
    );
  }

  const { data: c, error } = await sb.from("campaigns").select("*").eq("id", params.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) notFound();

  const { data: leadTimes, error: ltErr } = await sb
    .from("campaign_leads")
    .select("scheduled_at")
    .eq("campaign_id", params.id)
    .order("scheduled_at", { ascending: true });
  if (ltErr) throw new Error(ltErr.message);

  const times = (leadTimes ?? []).map((r) => r.scheduled_at as string);
  const startsAt = c.starts_at ? new Date(c.starts_at as string) : new Date();
  const windowH = Number(c.time_window_hours ?? 48);
  const hourly = buildHourlyBuckets(startsAt, times, windowH);

  const { data: firstRows } = await sb
    .from("campaign_leads")
    .select("email,scheduled_at")
    .eq("campaign_id", params.id)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader title={c.name} description="Pre-flight preview — review pacing before going live." />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{c.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {c.total_leads} leads · window {windowH}h · tag{" "}
              <span className="font-mono text-foreground">{c.tag}</span>
            </span>
          </div>
        </div>
        <Link href={`/campaigns/${params.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Campaign detail
        </Link>
      </div>

      <CampaignPreviewClient
        campaignId={params.id}
        status={c.status as string}
        hourly={hourly}
        firstLeads={(firstRows ?? []) as { email: string; scheduled_at: string }[]}
      />
    </>
  );
}
