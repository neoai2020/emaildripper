import Link from "next/link";

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
import { Badge } from "@/components/ui/badge";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";
import { cn } from "@/lib/utils";

export default async function CampaignsPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return (
      <PageHeader
        title="Campaigns"
        description={UNCONFIGURED_APP}
      />
    );
  }

  const { data: rows, error } = await sb
    .from("campaigns")
    .select("id,name,tag,status,total_leads,sent_count,failed_count,starts_at,ends_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Campaigns" description="All drip sends, progress, and pause or resume controls in one place." />
        <Link href="/campaigns/new" className={cn(buttonVariants())}>
          New campaign
        </Link>
      </div>

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
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No campaigns yet.
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((r) => {
                const total = r.total_leads ?? 0;
                const sent = r.sent_count ?? 0;
                const failed = r.failed_count ?? 0;
                const donePct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.tag}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.status}</Badge>
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
                        <Link
                          href={`/campaigns/${r.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          View
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
