import Link from "next/link";

import { createBackupSnapshotFormAction } from "@/app/(app)/settings/backups/actions";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";
import { cn } from "@/lib/utils";

export default async function SettingsBackupsPage() {
  const sb = getServiceSupabase();
  let retention = 365;
  const files: { path: string; created_at: string | null }[] = [];

  if (sb) {
    const { data } = await sb.from("settings").select("backup_retention_days").eq("id", 1).single();
    if (data?.backup_retention_days != null) retention = Number(data.backup_retention_days);

    const { data: days } = await sb.storage.from("app-backups").list("snapshots", {
      limit: 40,
      sortBy: { column: "name", order: "desc" },
    });
    for (const d of days ?? []) {
      if (!d.name) continue;
      const prefix = `snapshots/${d.name}`;
      const { data: objs } = await sb.storage.from("app-backups").list(prefix, {
        limit: 40,
        sortBy: { column: "created_at", order: "desc" },
      });
      for (const o of objs ?? []) {
        if (o.name) {
          files.push({
            path: `${prefix}/${o.name}`,
            created_at: o.created_at ?? null,
          });
        }
      }
    }
    files.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  }

  return (
    <>
      <PageHeader
        title="Backups"
        description="Database PITR remains primary; gzip snapshots in app-backups are an optional export. Restore/delete from storage UI is not wired here yet — download the signed URL when exposed."
      />

      <div className="mt-8 space-y-6">
        {!sb ? (
          <p className="text-sm text-muted-foreground">{UNCONFIGURED_APP}</p>
        ) : (
          <>
            <div className="rounded-xl border border-border/80 p-6 text-sm text-muted-foreground">
              <p>
                Keep-at-least-days preference:{" "}
                <span className="font-mono text-foreground">{retention}</span> days (provider rules still apply).
              </p>
              <p className="mt-2">
                Cron-triggered uploads reuse the same secret as <code>/api/tick</code> — see{" "}
                <Link href="/settings/cron" className="text-primary underline-offset-4 hover:underline">
                  Settings → Timer
                </Link>
                .
              </p>
            </div>

            <div className="rounded-xl border border-border/80 p-6">
              <h2 className="font-heading text-sm font-semibold text-foreground">Create snapshot now</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Writes a gzip JSON digest to the <code>app-backups</code> bucket (service role).
              </p>
              <form className="mt-4" action={createBackupSnapshotFormAction}>
                <button type="submit" className={cn(buttonVariants())}>
                  Create snapshot
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-border/80 p-6">
              <h2 className="font-heading text-sm font-semibold text-foreground">Recent files</h2>
              <ul className="mt-3 space-y-2 font-mono text-[11px] text-muted-foreground">
                {files.length === 0 ? (
                  <li>No snapshots found yet.</li>
                ) : (
                  files.slice(0, 25).map((f) => (
                    <li key={f.path} className="flex flex-wrap justify-between gap-2">
                      <span className="text-foreground">{f.path}</span>
                      <span>{f.created_at ?? "—"}</span>
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Signed download URLs are not shown in-app yet — use the Supabase dashboard or Storage API with a
                short-lived signed URL when you need to pull a file down.
              </p>
            </div>

            <p>
              <Link
                href="https://supabase.com/docs/guides/platform/backups"
                className="text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:underline"
              >
                Supabase backup documentation
              </Link>
            </p>
          </>
        )}
      </div>
    </>
  );
}
