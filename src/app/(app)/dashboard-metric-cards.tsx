"use client";

import type { ReactNode } from "react";

import { HelpTip } from "@/components/help-tip";
import type { TooltipId } from "@/lib/tooltips";
import { cn } from "@/lib/utils";

function KpiCard({
  title,
  tipId,
  description,
  value,
  valueClassName,
}: {
  title: string;
  tipId: TooltipId;
  description: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <section
      className={cn("rounded-lg border border-border/80 bg-card p-4 shadow-sm")}
      aria-labelledby={`kpi-${String(tipId)}-title`}
    >
      <dl className="space-y-1">
        <div className="flex items-center gap-2">
          <dt id={`kpi-${String(tipId)}-title`} className="text-xs font-medium text-muted-foreground">
            {title}
          </dt>
          <HelpTip id={tipId} />
        </div>
        <dd
          className={cn(
            "text-[28px] font-semibold leading-none tracking-tight text-foreground tabular-nums",
            valueClassName
          )}
        >
          {value}
        </dd>
        <dd className="text-[11px] leading-snug text-muted-foreground">{description}</dd>
      </dl>
    </section>
  );
}

export function DashboardMetricCards({
  activeCampaigns,
  leadsInFlight,
  sentToday,
  failedLast24h,
  maxTickGapSec,
  makeOpsBar,
}: {
  activeCampaigns: string;
  leadsInFlight: string;
  sentToday: string;
  failedLast24h: string;
  maxTickGapSec: number | null;
  makeOpsBar: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          tipId="dashboard.active"
          title="Active campaigns"
          description="Campaigns currently in flight"
          value={activeCampaigns}
        />
        <KpiCard
          tipId="dashboard.leadsInFlight"
          title="Leads in flight"
          description="Pending or processing sends"
          value={leadsInFlight}
        />
        <KpiCard
          tipId="dashboard.sentToday"
          title="Sent today"
          description="Leads delivered to Make.com today (UTC)"
          value={sentToday}
        />
        <KpiCard
          tipId="dashboard.failed24"
          title="Failed (24h)"
          description="Leads that failed after all retries"
          value={failedLast24h}
        />
        <KpiCard
          tipId="dashboard.tickGap"
          title="Worker tick gap"
          description="Max seconds between ticks in the last hour"
          value={maxTickGapSec != null ? String(maxTickGapSec) : "—"}
          valueClassName="font-mono text-[22px]"
        />
      </div>
      {makeOpsBar}
    </div>
  );
}
