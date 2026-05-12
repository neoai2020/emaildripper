import Link from "next/link";
import { Suspense } from "react";

import { CampaignsToolbar } from "@/app/(app)/campaigns/campaigns-toolbar";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
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
import { StatusBadge } from "@/components/status-badge";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";
import { cn } from "@/lib/utils";

function sanitizeSearch(raw: string) {
  return raw.replace(/[^a-zA-Z0-9@.\s_-]/g, "").slice(0, 80);
}

async function CampaignsTable({
  q,
  recoverable,
}: {
  q: string;
  recoverable: boolean;
}) {
  const sb = getServiceSupabase();
  if (!sb) return null;

  let query = sb
    .from("campaigns")
    .select("id,name,tag,status,total_leads,sent_count,failed_count,starts_at,ends_at,created_at,purge_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const safe = sanitizeSearch(q);
  if (safe) {
    const like = `%${safe}%`;
    query = query.or(`name.ilike.${like},tag.ilike.${like}`);
  }

  if (recoverable) {
    const nowIso = new Date().toISOString();
    query = query.eq("status", "cancelled").gt("purge_at", nowIso);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  if ((rows ?? []).length === 0) {
    return (
      <EmptyState
        title="No campaigns match"
        description={
          safe || recoverable
            ? "Try clearing filters or start a new drip."
            : "Create your first campaign to see pacing and progress here."
        }
        actionHref="/campaigns/new"
        actionLabel="New campaign"
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/80">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Tag</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-right">Open</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows!.map((r) => {
            const total = r.total_leads ?? 0;
            const sent = r.sent_count ?? 0;
            const failed = r.failed_count ?? 0;
            const donePct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.tag}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status as string} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {sent}/{total} sent · {failed} failed · {donePct}%
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {r.status === "previewing" ? (
                      <Link
                        href={`/campaigns/${r.id}/preview`}
                        className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                      >
                        Preview
                      </Link>
                    ) : null}
                    <Link href={`/campaigns/${r.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      View
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

async function CampaignsBody({ q, recoverable }: { q: string; recoverable: boolean }) {
  return (
    <>
      <CampaignsToolbar />
      <CampaignsTable q={q} recoverable={recoverable} />
    </>
  );
}

export default function CampaignsPage({
  searchParams,
}: {
  searchParams: { q?: string; recoverable?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const recoverable = searchParams.recoverable === "1";

  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Campaigns" description={UNCONFIGURED_APP} />;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Campaigns" description="All drip sends, progress, and pause or resume controls in one place." />
        <Link href="/campaigns/new" className={cn(buttonVariants())}>
          New campaign
        </Link>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <CampaignsBody q={q} recoverable={recoverable} />
      </Suspense>
    </>
  );
}
