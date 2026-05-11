import { subDays, format } from "date-fns";

import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";

import { DailySendsChart, SendsByArChart } from "./analytics-charts";

export default async function AnalyticsPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Analytics" description={UNCONFIGURED_APP} />;
  }

  const since = subDays(new Date(), 14).toISOString();

  const [{ data: leads, error: lErr }, { data: ticks, error: tErr }, { data: ars }, { data: failedRows, error: fErr }] =
    await Promise.all([
      sb
        .from("campaign_leads")
        .select("sent_at,campaign_id")
        .eq("status", "sent")
        .not("sent_at", "is", null)
        .gte("sent_at", since)
        .limit(8000),
      sb.from("tick_log").select("id,at,leads_processed,errors,duration_ms").order("at", { ascending: false }).limit(20),
      sb.from("autoresponders").select("id,name"),
      sb
        .from("campaign_lead_logs")
        .select("error_message,attempted_at")
        .eq("outcome", "failure")
        .gte("attempted_at", since)
        .limit(4000),
    ]);
  if (lErr) throw new Error(lErr.message);
  if (tErr) throw new Error(tErr.message);
  if (fErr) throw new Error(fErr.message);

  const failByMsg = new Map<string, number>();
  for (const r of failedRows ?? []) {
    const k = (r.error_message as string | null)?.trim() || "(no message)";
    failByMsg.set(k, (failByMsg.get(k) ?? 0) + 1);
  }
  const failTable = Array.from(failByMsg.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const arName = new Map((ars ?? []).map((a) => [a.id as string, a.name as string]));
  const campIds = Array.from(new Set((leads ?? []).map((r) => r.campaign_id as string)));
  const campToAr = new Map<string, string>();
  if (campIds.length > 0) {
    const { data: camps, error: cErr } = await sb
      .from("campaigns")
      .select("id,autoresponder_id")
      .in("id", campIds);
    if (cErr) throw new Error(cErr.message);
    for (const c of camps ?? []) {
      campToAr.set(c.id as string, c.autoresponder_id as string);
    }
  }

  const byDay = new Map<string, number>();
  const byAr = new Map<string, number>();

  for (const row of leads ?? []) {
    const sent = row.sent_at as string;
    const day = format(new Date(sent), "yyyy-MM-dd");
    byDay.set(day, (byDay.get(day) ?? 0) + 1);

    const aid = campToAr.get(row.campaign_id as string);
    const label = aid ? (arName.get(aid) ?? aid.slice(0, 8)) : "Unknown";
    byAr.set(label, (byAr.get(label) ?? 0) + 1);
  }

  const days: { day: string; sends: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    days.push({ day: d, sends: byDay.get(d) ?? 0 });
  }

  const arRows = Array.from(byAr.entries())
    .map(([name, sends]) => ({ name, sends }))
    .sort((a, b) => b.sends - a.sends)
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Last 14 days of successful sends, Make.com delivery errors, and how often the sender ran."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border/80 p-4">
          <h2 className="mb-4 font-heading text-sm font-semibold">Sends by day</h2>
          <DailySendsChart data={days} />
        </div>
        <div className="rounded-xl border border-border/80 p-4">
          <h2 className="mb-4 font-heading text-sm font-semibold">Sends by autoresponder</h2>
          {arRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sends in this window.</p>
          ) : (
            <SendsByArChart data={arRows} />
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-heading text-sm font-semibold">Make.com delivery errors (14 days)</h2>
        <div className="rounded-xl border border-border/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Error message</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failTable.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-sm text-muted-foreground">
                    No failed leads in this window.
                  </TableCell>
                </TableRow>
              ) : (
                failTable.map((r) => (
                  <TableRow key={r.message}>
                    <TableCell className="max-w-md truncate font-mono text-xs">{r.message}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-heading text-sm font-semibold">Recent sender runs</h2>
        <div className="rounded-xl border border-border/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>At (UTC)</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>Duration (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ticks ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No sender runs recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                ticks!.map((r) => (
                  <TableRow key={String(r.id ?? r.at)}>
                    <TableCell className="font-mono text-[11px]">
                      {r.at ? new Date(r.at as string).toISOString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.leads_processed}</TableCell>
                    <TableCell className="font-mono text-xs">{r.errors}</TableCell>
                    <TableCell className="font-mono text-xs">{r.duration_ms}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
