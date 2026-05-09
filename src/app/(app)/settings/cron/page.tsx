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
        title="Cron setup"
        description="Call the tick endpoint every minute so due leads are processed. Use a secret token only you and your scheduler know."
      />

      <div className="mt-8 space-y-6 rounded-xl border border-border/80 p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          Tick URL
          <HelpTip id="cron.tick" />
        </div>
        {!base ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_APP_URL</code> to your public origin if reverse
            proxy headers are not available, so this page can show the full tick URL.
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
          <li>
            Add <code className="rounded bg-muted px-1">CRON_TOKEN</code> to your deployment environment.
          </li>
          <li>Use cron-job.org or your host scheduler with a 1-minute interval.</li>
          <li>Confirm responses are 200 in your scheduler history after deploy.</li>
        </ul>
      </div>
    </>
  );
}
