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
import {
  cancelCampaignAction,
  discardPreviewCampaignAction,
  pauseCampaignAction,
  undoCancelCampaignAction,
} from "@/app/(app)/campaigns/actions";
import { ResumeCampaignPanel } from "@/app/(app)/campaigns/[id]/resume-campaign-panel";
import { getServiceSupabase } from "@/lib/db";
import { formatUtcDateTime, humanizeStatus } from "@/lib/format-display";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";
import { cn } from "@/lib/utils";

function sanitizeLeadSearch(raw: string) {
  return raw.replace(/[^a-zA-Z0-9@._+-]/g, "").slice(0, 120);
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { q?: string };
}) {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Campaign" description={UNCONFIGURED_APP} />;
  }

  const { data: c, error } = await sb.from("campaigns").select("*").eq("id", params.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) notFound();

  const qRaw = (searchParams.q ?? "").trim();
  const q = sanitizeLeadSearch(qRaw);
  let leadsQuery = sb
    .from("campaign_leads")
    .select("id,email,status,scheduled_at,sent_at,attempt_count,make_response_status,error_message")
    .eq("campaign_id", params.id)
    .order("scheduled_at", { ascending: true })
    .limit(200);
  if (q) leadsQuery = leadsQuery.ilike("email", `%${q}%`);
  const { data: leads } = await leadsQuery;

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

  const canUndoCancel =
    c.status === "cancelled" &&
    (!c.purge_at || (typeof c.purge_at === "string" && new Date(c.purge_at as string) > new Date()));

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
          {canUndoCancel ? (
            <form action={undoCancelCampaignAction.bind(null, c.id as string)}>
              <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Undo cancel
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <form method="get" className="mb-4 flex max-w-md flex-wrap items-end gap-2">
        <div className="grid flex-1 gap-1">
          <label htmlFor="lead-q" className="text-xs text-muted-foreground">
            Filter leads by email
          </label>
          <input
            id="lead-q"
            name="q"
            defaultValue={qRaw}
            placeholder="contains…"
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          />
        </div>
        <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Apply
        </button>
      </form>

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
