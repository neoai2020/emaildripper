"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { pauseCampaignAction } from "@/app/(app)/campaigns/actions";
import { getDashboardSnapshotAction, type DashboardSnapshot } from "@/app/(app)/dashboard-actions";
import { DashboardMetricCards } from "@/app/(app)/dashboard-metric-cards";
import { HelpTip } from "@/components/help-tip";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUtcDateTime } from "@/lib/format-display";
import { cn } from "@/lib/utils";

const GAP_WARN_SEC = 180;

function TickGapChart({ rows }: { rows: DashboardSnapshot["tickGaps"] }) {
  const data = rows.map((r, i) => ({
    n: i + 1,
    gapMin: Number((r.gapSec / 60).toFixed(2)),
    fill: r.gapSec > GAP_WARN_SEC ? "hsl(0 72% 50%)" : "hsl(142 55% 42%)",
    gapSec: r.gapSec,
  }));
  if (data.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">No tick history in the last 24 hours yet</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          After your scheduler calls <span className="font-mono">/api/tick</span>, this chart shows spacing between
          runs.
        </p>
      </div>
    );
  }
  return (
    <div className="w-full min-w-0 space-y-1">
      <div className="h-48 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="n" tick={{ fontSize: 9 }} label={{ value: "Tick #", position: "insideBottom", offset: -4, fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={36} label={{ value: "min", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, _n, props) => {
                const sec = props?.payload?.gapSec;
                return [`${Number(value)} min (${sec}s)`, "Gap"];
              }}
            />
            <Bar dataKey="gapMin" name="Gap (min)" radius={[2, 2, 0, 0]}>
              {data.map((e) => (
                <Cell key={e.n} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">
        <span className="mr-2 inline-block size-2 rounded-sm bg-[hsl(142_55%_42%)] align-middle" /> OK
        <span className="mx-2 inline-block size-2 rounded-sm bg-[hsl(0_72%_50%)] align-middle" /> Long gap (&gt;3
        min)
      </p>
    </div>
  );
}

function TickTimeline1h({ rows }: { rows: DashboardSnapshot["tickBuckets1h"] }) {
  const data = rows.map((r) => ({
    t: r.bucketLabel,
    v: r.hadTick,
    fill: r.hadTick ? "hsl(142 55% 42%)" : "hsl(0 72% 50%)",
    iso: r.bucketStartIso,
  }));
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data.</p>;
  }
  const any = rows.some((r) => r.hadTick);
  if (!any) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">No ticks recorded in the last hour</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          If you see gaps, your scheduler may be unreachable or <span className="font-mono">/api/tick</span> is
          failing.
        </p>
      </div>
    );
  }
  return (
    <div className="w-full min-w-0 space-y-1">
      <p className="text-[11px] text-muted-foreground">
        <span className="mr-1 inline-block size-2 rounded-sm bg-[hsl(142_55%_42%)] align-middle" /> Tick
        <span className="mx-2 inline-block size-2 rounded-sm bg-[hsl(0_72%_50%)] align-middle" /> Gap
      </p>
      <div className="h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="t" tick={{ fontSize: 8 }} interval={9} />
            <YAxis domain={[0, 1]} ticks={[0, 1]} width={28} tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(_v, _n, item) => {
                const iso = item?.payload?.iso as string | undefined;
                const had = item?.payload?.v;
                return [had ? "Tick ran" : "No tick", iso ? formatUtcDateTime(iso, { seconds: true }) : ""];
              }}
            />
            <Bar dataKey="v" radius={[1, 1, 0, 0]}>
              {data.map((e, i) => (
                <Cell key={i} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">
        If you see gaps, cron-job.org is unreachable or your <span className="font-mono">/api/tick</span> route is
        failing.
      </p>
    </div>
  );
}

export function DashboardClient({ initial }: { initial: DashboardSnapshot | null }) {
  const q = useQuery({
    queryKey: ["dashboard-snapshot"],
    queryFn: () => getDashboardSnapshotAction(),
    initialData: initial ?? undefined,
    refetchInterval: 30_000,
  });

  const [ageSec, setAgeSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAgeSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setAgeSec(0);
  }, [q.dataUpdatedAt]);

  const snap = q.data;
  if (!snap) {
    return <p className="text-sm text-muted-foreground">Dashboard data is unavailable (check database configuration).</p>;
  }

  const m = snap.metrics;
  const lastTick = m.lastTickAt ? formatUtcDateTime(m.lastTickAt, { seconds: true }) : "—";
  const lastOk = m.lastSuccessfulTickAt
    ? formatUtcDateTime(m.lastSuccessfulTickAt, { seconds: true })
    : "—";

  const refIso = m.lastSuccessfulTickAt ?? m.lastTickAt;
  const refMs = refIso ? new Date(refIso).getTime() : NaN;
  const sec = Number.isFinite(refMs) ? Math.round(Date.now() - refMs) : null;
  const dotClass =
    sec == null ? "bg-red-500" : sec <= 90 ? "bg-emerald-500" : sec <= 300 ? "bg-amber-500" : "bg-red-500";

  const maxGapSec =
    m.maxTickGapMsLastHour != null && Number.isFinite(m.maxTickGapMsLastHour)
      ? Math.round(m.maxTickGapMsLastHour / 1000)
      : null;

  const makeOpsBar = (
    <section className="rounded-lg border border-border/80 bg-card p-4" aria-labelledby="dash-makeops">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="dash-makeops" className="font-heading text-sm font-semibold text-foreground">
          Make.com ops this month (estimate)
        </h2>
        <HelpTip id="dashboard.makeOps" />
      </div>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
        ~{m.makeOpsEstimate} est. ops
        <span className="ml-2 text-sm font-normal text-muted-foreground">· limit: {m.makeOpsLimit ?? "—"}</span>
      </p>
      {m.makeOpsLimit != null && Number(m.makeOpsLimit) > 0 ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-all",
              Number(m.makeOpsEstimate) >= Number(m.makeOpsLimit) * 0.8 && "bg-amber-500"
            )}
            style={{
              width: `${Math.min(100, Math.round((Number(m.makeOpsEstimate) / Number(m.makeOpsLimit)) * 100))}%`,
            }}
          />
        </div>
      ) : null}
    </section>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-2 text-[12px] text-muted-foreground">
        <span className="tabular-nums" aria-live="polite">
          Last refreshed {ageSec}s ago
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-0.5">
          <span className={cn("size-2 rounded-full", dotClass)} aria-hidden />
          <span className="font-mono text-[11px] tabular-nums">
            Worker {lastOk !== "—" ? `OK ${lastOk}` : `tick ${lastTick}`}
          </span>
        </span>
      </div>

      <DashboardMetricCards
        activeCampaigns={String(m.activeCount)}
        leadsInFlight={String(m.leadsInFlight)}
        sentToday={String(m.sentToday)}
        failedLast24h={String(m.failed24h)}
        maxTickGapSec={maxGapSec}
        makeOpsBar={makeOpsBar}
      />

      <div className="rounded-xl border border-border/80 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">Active campaigns</h2>
            <p className="text-xs text-muted-foreground">Name, tag, autoresponder, progress, status, quick actions.</p>
          </div>
          <HelpTip id="dashboard.activeTable" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>AR</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snap.activeCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No active campaigns.</p>
                  <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm", className: "mt-4" }))}>
                    Create campaign
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              snap.activeCampaigns.map((c) => {
                const pct = c.total > 0 ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-[180px] truncate font-medium">{c.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{c.tag}</code>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                      {c.autoresponderName ?? "—"}
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                        {c.sent}/{c.total} sent · {c.failed} failed
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/campaigns/${c.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                          View
                        </Link>
                        {c.status === "running" || c.status === "scheduled" ? (
                          <form action={pauseCampaignAction.bind(null, c.id)}>
                            <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                              Pause
                            </button>
                          </form>
                        ) : null}
                        {c.status === "paused" ? (
                          <Link href={`/campaigns/${c.id}`} className={cn(buttonVariants({ size: "sm" }))}>
                            Resume
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-heading text-sm font-semibold">Per-AR volume (UTC today)</h2>
            <HelpTip id="dashboard.arCapBars" />
          </div>
          <ul className="space-y-3 text-sm">
            {snap.arUsage.length === 0 ? (
              <li className="text-muted-foreground">No autoresponders configured.</li>
            ) : (
              snap.arUsage.map((ar) => {
                const cap = ar.cap;
                const pct = cap != null && cap > 0 ? Math.min(100, Math.round((ar.sentToday / cap) * 100)) : null;
                return (
                  <li key={ar.id} className="space-y-1">
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">{ar.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {ar.sentToday}
                        {cap != null ? ` / ${cap}` : " / ∞"}
                      </span>
                    </div>
                    {pct != null ? (
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full bg-primary", pct >= 90 && "bg-amber-500")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No daily cap configured.</p>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-border/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-heading text-sm font-semibold">Recent failures</h2>
            <HelpTip id="dashboard.failures" />
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Last delivery failures from logs (up to 10).</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Time (UTC)</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>AR</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snap.recentFailures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No failures on file.
                  </TableCell>
                </TableRow>
              ) : (
                snap.recentFailures.map((r, i) => (
                  <TableRow key={`${r.campaign_id}-${i}`}>
                    <TableCell className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatUtcDateTime(r.attemptedAt, { seconds: true })}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs" title={r.email}>
                      {r.email}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">{r.ar_name ?? "—"}</TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-xs text-muted-foreground"
                      title={`${r.error_message ?? "—"}${r.http_status != null ? ` HTTP ${r.http_status}` : ""}`}
                    >
                      {r.error_message ?? "—"}
                      {r.http_status != null ? ` (HTTP ${r.http_status})` : ""}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 p-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-heading text-sm font-semibold">Worker tick timeline (last hour)</h2>
          <HelpTip id="dashboard.tickSpark" />
        </div>
        <TickTimeline1h rows={snap.tickBuckets1h} />
      </div>

      <div className="rounded-xl border border-border/80 p-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-heading text-sm font-semibold">Tick gaps (24h)</h2>
          <HelpTip id="dashboard.tickSpark" />
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Minutes between consecutive worker runs. Bars turn red when the gap exceeds three minutes.
        </p>
        <TickGapChart rows={snap.tickGaps} />
      </div>
    </div>
  );
}
