import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <>
      <PageHeader
        title="Help"
        description="How this app, Make.com, and your scheduled timer work together, and what to check when something looks wrong."
      />

      <div className="mt-8 max-w-3xl space-y-10">
        <Section title="How the pieces fit together">
          <p>
            <strong className="text-foreground">You</strong> use this website to set up autoresponders (Make.com
            links), import addresses, and build campaigns. <strong className="text-foreground">A timer service</strong>{" "}
            (for example cron-job.org) calls a private address on this site about once a minute. Each run looks for
            addresses that are due to send, packages them securely, posts them to your Make.com scenario, then records
            success or failure so you can see progress on the dashboard.
          </p>
        </Section>

        <Section title="What your host or developer configures">
          <p>
            The live app needs a database connection and a few secret values in the hosting panel (including the token
            the timer sends). If anything here says data cannot load, that setup is incomplete — whoever deployed the
            app should finish it.
          </p>
        </Section>

        <Section title="Timer (external scheduler)">
          <p>
            In{" "}
            <Link href="/settings/cron" className="text-primary underline-offset-4 hover:underline">
              Settings → Timer
            </Link>{" "}
            copy the full address and paste it into your scheduler with a one-minute interval. The same page lists an
            optional backup upload URL if you use file snapshots.
          </p>
        </Section>

        <Section title="Campaign lifecycle">
          <ol className="list-inside list-decimal space-y-2">
            <li>Wizard: add leads, set timing, add a tag, then open the preview while the campaign stays in preview.</li>
            <li>Preview: review the hourly chart and the first scheduled sends.</li>
            <li>Launch: the campaign starts sending; the timer keeps delivering until everyone is done or you pause.</li>
            <li>Pause: pending sends are frozen; when you resume, times shift forward by how long you were paused.</li>
          </ol>
        </Section>

        <Section title="Make.com checklist">
          <ul className="list-inside list-disc space-y-1">
            <li>Keep one Make scenario for each autoresponder row in this app.</li>
            <li>Match the signing step in Make to the secret saved here so only real traffic is accepted.</li>
            <li>Return success only when your email tool accepted the lead; otherwise this app will retry sensibly.</li>
            <li>Keep heavy logic in Make light — pacing, tags, and suppression are handled here.</li>
          </ul>
        </Section>

        <Section title="Saved CSV column maps">
          <p>
            Under{" "}
            <Link href="/templates/csv-mappings" className="text-primary underline-offset-4 hover:underline">
              CSV column mappings
            </Link>{" "}
            you can store how spreadsheet headers line up with email and name fields. Reusing a map skips the mapping
            step the next time you import the same layout.
          </p>
        </Section>

        <Section title="Backups">
          <p>
            Your database provider already includes automatic backups on paid plans. Optional file snapshots are
            described under{" "}
            <Link href="/settings/backups" className="text-primary underline-offset-4 hover:underline">
              Settings → Backups
            </Link>
            .
          </p>
        </Section>

        <Section title="Planned improvements">
          <p>
            Larger features such as automatic bounce handling, stricter access control, and multi-user login are
            tracked for future releases. The day-to-day loop stays: timer → this app → Make.com → clear status in the
            dashboard.
          </p>
        </Section>

        <Section title="Troubleshooting">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Timer returns “unauthorized”</strong> — the secret in your scheduler
              does not match the one in hosting settings.
            </li>
            <li>
              <strong className="text-foreground">Health check says the sender is stale</strong> — the timer has not
              successfully reached the app recently; confirm the address, secret, and that the site is online.
            </li>
            <li>
              <strong className="text-foreground">Campaign stuck in processing</strong> — a lead can stay locked until
              its lock expires; check Make.com errors and the campaign detail view.
            </li>
          </ul>
          <p className="pt-2">
            <Link href="/settings/danger" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Danger zone
            </Link>{" "}
            contains irreversible maintenance tools — read every warning before using them.
          </p>
        </Section>
      </div>
    </>
  );
}
