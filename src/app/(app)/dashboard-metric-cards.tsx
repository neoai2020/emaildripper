"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HelpTip } from "@/components/help-tip";

export function DashboardMetricCards({
  activeCampaigns,
  sentToday,
  failedLast24h,
  lastTickAt,
  makeOpsEstimate,
  makeOpsLimit,
}: {
  activeCampaigns: string;
  sentToday: string;
  failedLast24h: string;
  lastTickAt: string;
  makeOpsEstimate: string;
  makeOpsLimit: string | null;
}) {
  const limitNum = makeOpsLimit != null ? Number(makeOpsLimit) : NaN;
  const estNum = Number(makeOpsEstimate);
  const warn =
    Number.isFinite(limitNum) && limitNum > 0 && Number.isFinite(estNum) && estNum >= limitNum * 0.8;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Active campaigns</CardTitle>
            <HelpTip id="dashboard.active" />
          </div>
          <CardDescription>running + scheduled + paused</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm font-medium leading-snug text-foreground">{activeCampaigns}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Sent today (UTC)</CardTitle>
            <HelpTip id="dashboard.sentToday" />
          </div>
          <CardDescription>Successful sends since midnight UTC</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm font-medium leading-snug text-foreground">{sentToday}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Failed (24h)</CardTitle>
            <HelpTip id="dashboard.failed24" />
          </div>
          <CardDescription>terminal failures logged recently</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm font-medium leading-snug text-foreground">{failedLast24h}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Last tick</CardTitle>
            <HelpTip id="dashboard.lastTick" />
          </div>
          <CardDescription>Last time the sending worker ran</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium leading-snug text-foreground tabular-nums">{lastTickAt}</p>
        </CardContent>
      </Card>

      <Card size="sm" className="md:col-span-2 xl:col-span-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Make ops estimate (30d)</CardTitle>
            <HelpTip id="dashboard.makeOps" />
          </div>
          <CardDescription>Rough estimate: about two Make.com steps per successful send, last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-mono text-sm font-medium text-foreground">
            ~{makeOpsEstimate} est. ops · limit: {makeOpsLimit ?? "—"}
          </p>
          {warn ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              You are within about 20% of the configured monthly Make.com usage limit. Leave headroom for retries
              inside Make.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
