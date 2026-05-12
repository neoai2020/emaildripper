import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildHourlyBuckets } from "@/lib/campaign/hourlyBuckets";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";
import { cn } from "@/lib/utils";

import { CampaignPreviewClient, type PreviewSummary } from "./campaign-preview-client";

export default async function CampaignPreviewPage({ params }: { params: { id: string } }) {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Pre-flight preview" description={UNCONFIGURED_APP} />;
  }

  const { data: c, error } = await sb.from("campaigns").select("*").eq("id", params.id).maybeSingle();
  if (error) {
    return (
      <PageHeader
        title="Pre-flight preview"
        description={`Could not load this campaign from the database (${error.message}). If you recently deployed, apply pending Supabase migrations on the hosted project, then retry.`}
      />
    );
  }
  if (!c) notFound();

  const { data: leadTimes, error: ltErr } = await sb
    .from("campaign_leads")
    .select("scheduled_at")
    .eq("campaign_id", params.id)
    .order("scheduled_at", { ascending: true });
  if (ltErr) {
    return (
      <PageHeader
        title="Pre-flight preview"
        description={`Could not load scheduled sends (${ltErr.message}). Check the database connection and migrations, then refresh.`}
      />
    );
  }

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

  const { count: pendingCount } = await sb
    .from("campaign_leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", params.id)
    .eq("status", "pending");

  const { data: ar } = await sb
    .from("autoresponders")
    .select("account_email,daily_cap,warmup_enabled")
    .eq("id", c.autoresponder_id as string)
    .maybeSingle();

  const summary: PreviewSummary = {
    arEmail: (ar?.account_email as string | null) ?? null,
    dailyCap: ar?.daily_cap != null ? Number(ar.daily_cap) : null,
    warmup: Boolean(ar?.warmup_enabled),
    totalLeads: Number(c.total_leads ?? 0),
    startsAt: (c.starts_at as string | null) ?? null,
    endsAt: (c.ends_at as string | null) ?? null,
    tag: String(c.tag ?? ""),
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader title={c.name} description="Review send timing before you start this campaign." />
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
        summary={summary}
        pendingCount={pendingCount ?? 0}
      />
    </>
  );
}
