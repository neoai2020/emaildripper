"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { pauseCampaignAction } from "@/app/(app)/campaigns/actions";
import { getDashboardSnapshotAction, type DashboardSnapshot } from "@/app/(app)/dashboard-actions";
import { DashboardMetricCards } from "@/app/(app)/dashboard-metric-cards";
import { HelpTip } from "@/components/help-tip";
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
    fill: r.gapSec > GAP_WARN_SEC ? "var(--destructive)" : "hsl(142 70% 40%)",
  }));
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No tick history in the last 24 hours yet.</p>;
  }
  return (
    <div className="h-48 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="n" tick={{ fontSize: 9 }} label={{ value: "Tick #", position: "insideBottom", offset: -4, fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={36} label={{ value: "min", angle: -90, position: "insideLeft", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value)} min between ticks`, "Gap"]}
          />
          <Bar dataKey="gapMin" radius={[2, 2, 0, 0]}>
            {data.map((e) => (
              <Cell key={e.n} fill={e.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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

  const snap = q.data;
  if (!snap) {
    return <p className="text-sm text-muted-foreground">Dashboard data is unavailable (check database configuration).</p>;
  }

  const m = snap.metrics;
  const lastTick = m.lastTickAt ? formatUtcDateTime(m.lastTickAt, { seconds: true }) : "—";
  const lastOk = m.lastSuccessfulTickAt
    ? formatUtcDateTime(m.lastSuccessfulTickAt, { seconds: true })
    : "—";

  return (
    <div className="space-y-8">
      <DashboardMetricCards
        activeCampaigns={String(m.activeCount)}
        sentToday={String(m.sentToday)}
        failedLast24h={String(m.failed24h)}
        lastTickAt={lastOk !== "—" ? `${lastTick} · last OK: ${lastOk}` : lastTick}
        makeOpsEstimate={m.makeOpsEstimate}
        makeOpsLimit={m.makeOpsLimit}
      />

      <div className="rounded-xl border border-border/80 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">Active campaigns</h2>
            <p className="text-xs text-muted-foreground">Progress and quick controls.</p>
          </div>
          <HelpTip id="dashboard.activeTable" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snap.activeCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No active campaigns.
                </TableCell>
              </TableRow>
            ) : (
              snap.activeCampaigns.map((c) => {
                const pct = c.total > 0 ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">{c.status}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.sent}/{c.total} sent · {c.failed} failed · {pct}%
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
        <p className="mt-2 text-[11px] text-muted-foreground">
          Pause and resume use the campaign detail page forms for safety.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-heading text-sm font-semibold">Autoresponder send vs cap (UTC today)</h2>
            <HelpTip id="dashboard.arCapBars" />
          </div>
          <ul className="space-y-3 text-sm">
            {snap.arUsage.length === 0 ? (
              <li className="text-muted-foreground">No active autoresponders.</li>
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
            <h2 className="font-heading text-sm font-semibold">Tick gaps (24h)</h2>
            <HelpTip id="dashboard.tickSpark" />
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Minutes between consecutive worker runs. Bars turn red when the gap exceeds three minutes.
          </p>
          <TickGapChart rows={snap.tickGaps} />
        </div>
      </div>

      <div className="rounded-xl border border-border/80">
        <div className="border-b border-border/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-sm font-semibold">Recent failures</h2>
            <HelpTip id="dashboard.failures" />
          </div>
          <p className="text-xs text-muted-foreground">Newest terminal failures (up to 20).</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snap.recentFailures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  No failures on file.
                </TableCell>
              </TableRow>
            ) : (
              snap.recentFailures.map((r, i) => (
                <TableRow key={`${r.campaign_id}-${r.email}-${i}`}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.campaign_id}</TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">{r.error_message ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
