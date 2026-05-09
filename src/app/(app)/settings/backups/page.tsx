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
        description="Postgres is the source of truth. Supabase manages automated backups on paid tiers; otherwise export regularly."
      />

      <div className="mt-8 space-y-4 rounded-xl border border-border/80 p-6 text-sm text-muted-foreground">
        <p>
          Retention preference in settings: <span className="font-mono text-foreground">{retention}</span> days
          (informational — enforcement is in your backup provider).
        </p>
        <p>
          Open your Supabase project → <strong>Database</strong> → backups / point-in-time recovery, or run{" "}
          <code className="rounded bg-muted px-1">pg_dump</code> from a trusted machine and store artifacts in
          encrypted object storage.
        </p>
        <p>
          <Link
            href="https://supabase.com/docs/guides/platform/backups"
            className="text-primary underline-offset-4 hover:underline"
          >
            Supabase backup documentation
          </Link>
        </p>
      </div>
    </>
  );
}
