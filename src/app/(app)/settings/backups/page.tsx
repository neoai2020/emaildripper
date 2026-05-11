import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { getServiceSupabase } from "@/lib/db";

export default async function SettingsBackupsPage() {
  const sb = getServiceSupabase();
  let retention = 365;
  if (sb) {
    const { data } = await sb.from("settings").select("backup_retention_days").eq("id", 1).single();
    if (data?.backup_retention_days != null) retention = Number(data.backup_retention_days);
  }

  return (
    <>
      <PageHeader
        title="Backups"
        description="Your live data lives in the hosted database, which includes its own automatic backups on paid plans. Use this area for extra snapshots when that flow is wired up."
      />

      <div className="mt-8 space-y-4 rounded-xl border border-border/80 p-6 text-sm text-muted-foreground">
        <p>
          Keep-at-least-days preference in settings:{" "}
          <span className="font-mono text-foreground">{retention}</span> days (your host or database provider applies the
          real retention rules).
        </p>
        <p>
          In your database host’s dashboard, open backups or point-in-time recovery, or ask your administrator to export
          a full copy on a schedule you trust, and store that file somewhere encrypted.
        </p>
        <p>
          <Link
            href="https://supabase.com/docs/guides/platform/backups"
            className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Supabase backup documentation
          </Link>
        </p>
      </div>
    </>
  );
}
