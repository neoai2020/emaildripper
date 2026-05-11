import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cancelCampaignAction, discardPreviewCampaignAction, pauseCampaignAction } from "@/app/(app)/campaigns/actions";
import { ResumeCampaignPanel } from "@/app/(app)/campaigns/[id]/resume-campaign-panel";
import { getServiceSupabase } from "@/lib/db";
import { formatUtcDateTime, humanizeStatus } from "@/lib/format-display";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";
import { cn } from "@/lib/utils";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Campaign" description={UNCONFIGURED_APP} />;
  }

  const { data: c, error } = await sb.from("campaigns").select("*").eq("id", params.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) notFound();

  const { data: leads } = await sb
    .from("campaign_leads")
    .select("id,email,status,scheduled_at,sent_at,attempt_count,make_response_status,error_message")
    .eq("campaign_id", params.id)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  let resumeInfo: { pending: number; shiftMs: number } | null = null;
  if (c.status === "paused" && c.paused_at) {
    const shiftMs = Date.now() - new Date(c.paused_at as string).getTime();
    const { count } = await sb
      .from("campaign_leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", params.id)
      .eq("status", "pending");
    resumeInfo = { pending: count ?? 0, shiftMs: Math.max(0, shiftMs) };
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader title={c.name} description={`Campaign tag: ${c.tag}`} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{humanizeStatus(c.status as string)}</Badge>
            <span className="text-sm text-muted-foreground">
              {c.sent_count}/{c.total_leads} sent · {c.failed_count} failed
              {c.source_csv_path ? (
                <>
                  {" · "}
                  <span className="font-mono text-[11px]" title="Stored copy of the uploaded spreadsheet">
                    csv: {String(c.source_csv_path).slice(0, 48)}
                    {String(c.source_csv_path).length > 48 ? "…" : ""}
                  </span>
                </>
              ) : null}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            All campaigns
          </Link>
          {c.status === "previewing" ? (
            <>
              <Link
                href={`/campaigns/${c.id}/preview`}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              >
                Pre-flight preview
              </Link>
              <Link href={`/campaigns/${c.id}/preview`} className={cn(buttonVariants({ size: "sm" }))}>
                {"Review & launch…"}
              </Link>
              <form action={discardPreviewCampaignAction.bind(null, c.id)}>
                <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  Discard preview
                </button>
              </form>
            </>
          ) : null}
          {c.status === "running" || c.status === "scheduled" ? (
            <form action={pauseCampaignAction.bind(null, c.id)}>
              <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Pause
              </button>
            </form>
          ) : null}
          {c.status === "paused" && resumeInfo ? (
            <ResumeCampaignPanel campaignId={c.id} pendingCount={resumeInfo.pending} shiftMs={resumeInfo.shiftMs} />
          ) : null}
          {c.status !== "cancelled" &&
          c.status !== "completed" &&
          c.status !== "previewing" &&
          c.status !== "draft" ? (
            <form action={cancelCampaignAction.bind(null, c.id)}>
              <button type="submit" className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}>
                Cancel
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled (UTC)</TableHead>
              <TableHead>Sent (UTC)</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>HTTP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(leads ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No lead rows (yet).
                </TableCell>
              </TableRow>
            ) : (
              leads!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="text-xs">{humanizeStatus(r.status as string)}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                    {formatUtcDateTime(r.scheduled_at as string | null)}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                    {formatUtcDateTime(r.sent_at as string | null)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.attempt_count}</TableCell>
                  <TableCell className="font-mono text-xs">{r.make_response_status ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
