import { CopyButton } from "@/components/copy-button";
import { HelpTip } from "@/components/help-tip";
import { PageHeader } from "@/components/page-header";
import { getPublicBaseUrl } from "@/lib/public-url";

export default function SettingsCronPage() {
  const base = getPublicBaseUrl();
  const token = process.env.CRON_TOKEN ?? "";
  const tickPath = "/api/tick";
  const fullUrl = base ? `${base}${tickPath}?token=${encodeURIComponent(token)}` : "";

  return (
    <>
      <PageHeader
        title="Timer"
        description="Your external scheduler calls this address about once a minute so queued emails can go out. Keep the secret token private."
      />

      <div className="mt-8 space-y-6 rounded-xl border border-border/80 p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          Tick URL
          <HelpTip id="cron.tick" />
        </div>
        {!base ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Set your public site address in hosting settings so this page can show the full link to copy for your
            timer.
          </p>
        ) : null}
        <div className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">GET (or POST)</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full break-all rounded-lg bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed">
              {fullUrl || `${tickPath}?token=YOUR_CRON_TOKEN`}
            </code>
            {fullUrl ? <CopyButton text={fullUrl} label="Copy URL" /> : null}
          </div>
        </div>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Add the scheduler secret from your hosting panel to the deployment environment so calls are accepted.</li>
          <li>Use cron-job.org or your host’s scheduled tasks with a one-minute interval.</li>
          <li>After deploy, open your scheduler’s history and confirm each run finished successfully.</li>
        </ul>
        <div className="grid gap-2 border-t border-border/80 pt-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Optional timed job (same secret)</p>
          <p className="text-xs">
            Backup snapshot upload:{" "}
            <code className="break-all rounded bg-muted px-1 font-mono text-[11px]">
              {base ? `${base}/api/backup-snapshot?token=${encodeURIComponent(token)}` : "/api/backup-snapshot?token=…"}
            </code>
          </p>
        </div>
      </div>
    </>
  );
}
