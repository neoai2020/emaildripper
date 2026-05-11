import { DashboardMetricCards } from "@/app/(app)/dashboard-metric-cards";
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
export default async function DashboardPage() {
  const sb = getServiceSupabase();

  let activeCampaigns = 0;
  let sentToday = 0;
  let failedLast24h = 0;
  let lastTickAt: string | null = null;
  let makeOpsLimit: number | null = null;
  let sentLast30d = 0;
  const recentFailures: { email: string; campaign_id: string; error_message: string | null }[] = [];

  if (sb) {
    const { count: ac } = await sb
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .in("status", ["running", "scheduled", "paused"]);
    activeCampaigns = ac ?? 0;

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const { count: st } = await sb
      .from("campaign_leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", start.toISOString());
    sentToday = st ?? 0;

    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count: fl24 } = await sb
      .from("campaign_lead_logs")
      .select("id", { count: "exact", head: true })
      .eq("outcome", "failure")
      .gte("attempted_at", since24);
    failedLast24h = fl24 ?? 0;

    const { data: tick } = await sb
      .from("tick_log")
      .select("at")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastTickAt = tick?.at ?? null;

    const { data: settings } = await sb
      .from("settings")
      .select("make_ops_monthly_limit")
      .eq("id", 1)
      .maybeSingle();
    const rawLimit = settings?.make_ops_monthly_limit;
    makeOpsLimit = rawLimit != null && Number.isFinite(Number(rawLimit)) ? Number(rawLimit) : null;

    const since30 = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const { count: s30 } = await sb
      .from("campaign_leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", since30);
    sentLast30d = s30 ?? 0;

    const { data: fails } = await sb
      .from("campaign_leads")
      .select("email,campaign_id,error_message")
      .eq("status", "failed")
      .order("id", { ascending: false })
      .limit(8);
    for (const row of fails ?? []) {
      recentFailures.push({
        email: row.email as string,
        campaign_id: row.campaign_id as string,
        error_message: (row.error_message as string | null) ?? null,
      });
    }
  }

  const makeOpsEstimate = String((sentLast30d ?? 0) * 2);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Dashboard"
          description="Operational snapshot for when you open or reload this page."
        />
      </div>
      <DashboardMetricCards
        activeCampaigns={sb ? String(activeCampaigns) : "—"}
        sentToday={sb ? String(sentToday) : "—"}
        failedLast24h={sb ? String(failedLast24h) : "—"}
        lastTickAt={sb && lastTickAt ? new Date(lastTickAt).toISOString() : "—"}
        makeOpsEstimate={sb ? makeOpsEstimate : "—"}
        makeOpsLimit={makeOpsLimit != null ? String(makeOpsLimit) : null}
      />

      {sb ? (
        <div className="mt-8 rounded-xl border border-border/80">
          <div className="border-b border-border/80 px-4 py-3">
            <h2 className="font-heading text-sm font-semibold">Recent failures</h2>
            <p className="text-xs text-muted-foreground">The newest delivery failures we recorded (up to 8).</p>
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
              {recentFailures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    No failures on file.
                  </TableCell>
                </TableRow>
              ) : (
                recentFailures.map((r, i) => (
                  <TableRow key={`${r.campaign_id}-${r.email}-${i}`}>
                    <TableCell className="font-mono text-xs">{r.email}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{r.campaign_id}</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                      {r.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </>
  );
}
