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
  pauseCampaignAction,
  resumeCampaignAction,
} from "@/app/(app)/campaigns/actions";
import { getServiceSupabase } from "@/lib/db";
import { cn } from "@/lib/utils";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Campaign" description="Connect Supabase to view this campaign." />;
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

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader title={c.name} description={`Tag: ${c.tag}`} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{c.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {c.sent_count}/{c.total_leads} sent · {c.failed_count} failed
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            All campaigns
          </Link>
          {c.status === "running" || c.status === "scheduled" ? (
            <form action={pauseCampaignAction.bind(null, c.id)}>
              <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Pause
              </button>
            </form>
          ) : null}
          {c.status === "paused" ? (
            <form action={resumeCampaignAction.bind(null, c.id)}>
              <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Resume
              </button>
            </form>
          ) : null}
          {c.status !== "cancelled" && c.status !== "completed" ? (
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
              <TableHead>Scheduled</TableHead>
              <TableHead>Sent</TableHead>
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
                  <TableCell className="text-xs">{r.status}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {r.scheduled_at ? new Date(r.scheduled_at).toISOString() : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {r.sent_at ? new Date(r.sent_at).toISOString() : "—"}
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
