import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  discardPreviewCampaignAction,
  pauseCampaignAction,
  undoCancelCampaignAction,
} from "@/app/(app)/campaigns/actions";
import { CancelCampaignDialog } from "@/app/(app)/campaigns/[id]/cancel-campaign-dialog";
import { ResumeCampaignPanel } from "@/app/(app)/campaigns/[id]/resume-campaign-panel";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { getServiceSupabase } from "@/lib/db";
import { formatUtcDateTime } from "@/lib/format-display";
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
  if (error) {
    return (
      <PageHeader
        title="Campaign"
        description={`Could not load this campaign (${error.message}). Apply Supabase migrations if this appeared right after a deploy, then refresh.`}
      />
    );
  }
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

  const { data: leadIdRows } = await sb.from("campaign_leads").select("id,email").eq("campaign_id", params.id).limit(2000);
  const leadIds = (leadIdRows ?? []).map((r) => r.id as string);
  const emailByLeadId = new Map((leadIdRows ?? []).map((r) => [r.id as string, r.email as string]));
  let deliveryLogs: {
    attempted_at: string;
    outcome: string;
    http_status: number | null;
    error_message: string | null;
    response_body: string | null;
    attempt_number: number;
    email: string;
  }[] = [];
  if (leadIds.length > 0) {
    const { data: logs } = await sb
      .from("campaign_lead_logs")
      .select("attempted_at,outcome,http_status,error_message,response_body,attempt_number,campaign_lead_id")
      .in("campaign_lead_id", leadIds.slice(0, 800))
      .order("attempted_at", { ascending: false })
      .limit(50);
    deliveryLogs =
      logs?.map((row) => ({
        attempted_at: row.attempted_at as string,
        outcome: row.outcome as string,
        http_status: (row.http_status as number | null) ?? null,
        error_message: (row.error_message as string | null) ?? null,
        response_body: (row.response_body as string | null) ?? null,
        attempt_number: Number(row.attempt_number ?? 0),
        email: emailByLeadId.get(row.campaign_lead_id as string) ?? "—",
      })) ?? [];
  }

  const totalLeads = Number(c.total_leads ?? 0);
  const shownLeads = leads?.length ?? 0;
  const showLeadCountBanner = totalLeads > shownLeads && !q;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader title={c.name} description={`Campaign tag: ${c.tag}`} />
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={c.status as string} />
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
            <CancelCampaignDialog campaignId={c.id as string} />
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

      {showLeadCountBanner ? (
        <p className="mb-3 text-sm text-muted-foreground">
          {totalLeads.toLocaleString()} leads in this campaign — showing first {shownLeads} by schedule time.
        </p>
      ) : null}

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
                <TableCell colSpan={6} className="py-6">
                  <EmptyState
                    title="No lead rows yet"
                    description="Leads appear here after you launch or build a preview for this campaign."
                    actionHref="/campaigns"
                    actionLabel="Back to campaigns"
                  />
                </TableCell>
              </TableRow>
            ) : (
              leads!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[200px] truncate text-xs" title={r.email as string}>
                    {r.email}
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind="lead" status={r.status as string} />
                  </TableCell>
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

      <div className="mt-10 rounded-xl border border-border/80">
        <div className="border-b border-border/80 px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-foreground">Delivery log</h2>
          <p className="text-xs text-muted-foreground">
            Recent webhook attempts for this campaign (newest first). Use the lead filter above to narrow the lead
            table.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Time (UTC)</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>HTTP</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No delivery attempts logged yet.
                </TableCell>
              </TableRow>
            ) : (
              deliveryLogs.map((log) => (
                <TableRow key={`${log.attempted_at}-${log.email}-${log.attempt_number}`}>
                  <TableCell className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {formatUtcDateTime(log.attempted_at, { seconds: true })}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-xs">{log.email}</TableCell>
                  <TableCell className="tabular-nums text-xs">{log.attempt_number}</TableCell>
                  <TableCell className="text-xs capitalize">{log.outcome.replace(/_/g, " ")}</TableCell>
                  <TableCell className="font-mono text-xs">{log.http_status ?? "—"}</TableCell>
                  <TableCell
                    className="max-w-[240px] truncate text-xs text-muted-foreground"
                    title={log.response_body ?? log.error_message ?? ""}
                  >
                    {log.error_message ?? log.response_body ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
