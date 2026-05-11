"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import {
  activatePreviewCampaignAction,
  cancelCampaignAction,
  discardPreviewCampaignAction,
  sendPreviewTestLeadsAction,
  type PreviewTestLeadResult,
} from "@/app/(app)/campaigns/actions";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUtcDateTime } from "@/lib/format-display";

export type HourlyRow = { hour: string; sends: number };

export type PreviewSummary = {
  arEmail: string | null;
  dailyCap: number | null;
  warmup: boolean;
  totalLeads: number;
  startsAt: string | null;
  endsAt: string | null;
  tag: string;
};

export function CampaignPreviewClient({
  campaignId,
  status,
  hourly,
  firstLeads,
  summary,
  pendingCount,
}: {
  campaignId: string;
  status: string;
  hourly: HourlyRow[];
  firstLeads: { email: string; scheduled_at: string }[];
  summary: PreviewSummary;
  pendingCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const testModalRef = useRef<HTMLDialogElement>(null);
  const [dryRun, setDryRun] = useState(false);
  const [testResults, setTestResults] = useState<PreviewTestLeadResult[] | null>(null);
  const [localPending, setLocalPending] = useState(pendingCount);
  useEffect(() => {
    setLocalPending(pendingCount);
  }, [pendingCount]);

  function activate() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        if (dryRun) fd.set("dry_run", "on");
        await activatePreviewCampaignAction(campaignId, fd);
        toast.success(dryRun ? "Dry-run campaign is now running" : "Campaign is now running");
        dialogRef.current?.close();
        router.push(`/campaigns/${campaignId}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Launch failed");
      }
    });
  }

  function discard() {
    startTransition(async () => {
      try {
        await discardPreviewCampaignAction(campaignId);
        toast.success("Preview discarded");
        router.push("/campaigns");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Discard failed");
      }
    });
  }

  function sendTestLeads() {
    startTransition(async () => {
      try {
        const res = await sendPreviewTestLeadsAction(campaignId);
        setTestResults(res);
        setLocalPending((p) => Math.max(0, p - res.filter((r) => r.ok).length));
        testModalRef.current?.showModal();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Test send failed");
      }
    });
  }

  function launchRemaining() {
    startTransition(async () => {
      try {
        await activatePreviewCampaignAction(campaignId);
        toast.success("Campaign is now running");
        testModalRef.current?.close();
        router.push(`/campaigns/${campaignId}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Launch failed");
      }
    });
  }

  function cancelFromModal() {
    startTransition(async () => {
      try {
        await cancelCampaignAction(campaignId);
        toast.success("Campaign cancelled");
        testModalRef.current?.close();
        router.push("/campaigns");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Cancel failed");
      }
    });
  }

  const isPreview = status === "previewing";
  const remainingAfterTest = localPending;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 rounded-xl border border-border/80 p-4 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-sm font-semibold text-foreground">Summary</h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-4">
              <dt className="flex items-center gap-1">
                Autoresponder email
                <HelpTip id="preview.arEmail" />
              </dt>
              <dd className="font-mono text-xs text-foreground">{summary.arEmail ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="flex items-center gap-1">
                Tag
                <HelpTip id="campaign.tag" />
              </dt>
              <dd className="font-mono text-xs text-foreground">{summary.tag}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Leads</dt>
              <dd className="font-mono text-xs text-foreground">{summary.totalLeads}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Pending</dt>
              <dd className="font-mono text-xs text-foreground">{localPending}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Daily cap (AR)</dt>
              <dd className="font-mono text-xs text-foreground">
                {summary.dailyCap != null ? summary.dailyCap : "Unlimited"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Warmup</dt>
              <dd className="text-foreground">{summary.warmup ? "Enabled" : "Off"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Window (UTC)</dt>
              <dd className="max-w-[min(100%,260px)] text-right text-[11px] tabular-nums text-foreground">
                {formatUtcDateTime(summary.startsAt)} → {formatUtcDateTime(summary.endsAt)}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
            Timeline (sends / hour)
            <HelpTip id="preview.chart" />
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Line shows the same buckets as the bar chart.</p>
          <div className="mt-3 h-40 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="sends" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {hourly.length > 0 ? (
        <div className="rounded-xl border border-border/80 p-4">
          <h2 className="mb-4 font-heading text-sm font-semibold">Histogram (sends by hour bucket)</h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sends" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/80">
        <div className="border-b border-border/80 px-4 py-3">
          <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
            First 20 scheduled sends
            <HelpTip id="preview.firstSends" />
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Scheduled (UTC)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {firstLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-sm text-muted-foreground">
                  No leads.
                </TableCell>
              </TableRow>
            ) : (
              firstLeads.map((r) => (
                <TableRow key={r.email + r.scheduled_at}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                    {formatUtcDateTime(r.scheduled_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 w-[min(100%,440px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 text-sm shadow-xl"
      >
        <h3 className="font-heading text-base font-semibold text-foreground">Confirm launch</h3>
        <p className="mt-2 text-muted-foreground">
          You are about to move this campaign from preview to <strong className="text-foreground">running</strong>.
          Your one-minute timer must already be calling this app with the correct secret, or sends will stall.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <strong className="text-foreground">Dry run</strong> — mark sends as successful without calling Make.com
            (only for testing counters and timing).
          </span>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
            Back
          </Button>
          <Button type="button" disabled={pending} onClick={activate}>
            {pending ? "Working…" : "Confirm launch"}
          </Button>
        </div>
      </dialog>

      <dialog
        ref={testModalRef}
        onClose={() => {
          /* keep previewing — no status change */
        }}
        className="fixed left-1/2 top-1/2 max-h-[min(90vh,560px)] w-[min(100%,480px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-6 text-sm shadow-xl"
      >
        <h3 className="font-heading text-base font-semibold text-foreground">Test send results</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          First leads posted to Make immediately. Successful rows are marked sent; this modal does not change preview
          status.
        </p>
        {testResults ? (
          <ul className="mt-4 space-y-3">
            {testResults.map((r) => (
              <li key={r.email} className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{r.email}</span>
                  <span className="text-lg">{r.ok ? "✅" : "❌"}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  HTTP {r.httpStatus} · {r.bodySnippet}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => testModalRef.current?.close()}>
            Close
          </Button>
          <Button type="button" disabled={pending || remainingAfterTest <= 0} onClick={launchRemaining}>
            {pending ? "Working…" : `Launch remaining ${remainingAfterTest}`}
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={cancelFromModal}>
            Cancel campaign
          </Button>
        </div>
      </dialog>

      <div className="flex flex-wrap gap-2">
        {isPreview ? (
          <>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" disabled={pending || pendingCount === 0} onClick={sendTestLeads}>
                {pending ? "Posting…" : "Send test (first 3 to Make)"}
              </Button>
              <HelpTip id="preview.testSend" />
            </div>
            <Button type="button" onClick={() => dialogRef.current?.showModal()} disabled={pending}>
              Launch campaign…
            </Button>
            <Button type="button" variant="outline" onClick={discard} disabled={pending}>
              Discard preview
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/campaigns/new")}>
              Edit (start over)
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" onClick={() => router.push(`/campaigns/${campaignId}`)}>
            Open campaign
          </Button>
        )}
      </div>
    </div>
  );
}
