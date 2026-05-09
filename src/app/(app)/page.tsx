import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getServiceSupabase } from "@/lib/db";

export default async function DashboardPage() {
  const sb = getServiceSupabase();

  let activeCampaigns = 0;
  let sentToday = 0;
  let failedLast24h = 0;
  let lastTickAt: string | null = null;

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

    const { count: fl } = await sb
      .from("campaign_leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");
    failedLast24h = fl ?? 0;

    const { data: tick } = await sb
      .from("tick_log")
      .select("at")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastTickAt = tick?.at ?? null;
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="High-level operational snapshot. Hook up Supabase to populate KPIs."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Active campaigns", value: sb ? String(activeCampaigns) : "—", hint: "running + scheduled + paused" },
          { title: "Sent today (UTC day)", value: sb ? String(sentToday) : "—", hint: "campaign_leads.sent_at" },
          { title: "Failed (total)", value: sb ? String(failedLast24h) : "—", hint: "status=failed" },
          {
            title: "Last tick",
            value: sb && lastTickAt ? new Date(lastTickAt).toISOString() : "—",
            hint: "tick_log.at",
          },
        ].map((kpi) => (
          <Card key={kpi.title} size="sm">
            <CardHeader>
              <CardTitle>{kpi.title}</CardTitle>
              <CardDescription>{kpi.hint}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm font-medium leading-snug text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
