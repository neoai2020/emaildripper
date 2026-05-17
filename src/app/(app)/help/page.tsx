import Link from "next/link";

import { HelpFeedback } from "@/app/(app)/help/help-feedback";
import { PageHeader } from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HelpPage() {
  return (
    <>
      <PageHeader
        title="Help"
        description="How this app, Make.com, and your external timer work together — without legacy alert channels."
      />

      <div className="mt-8 max-w-3xl">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="overview">
            <AccordionTrigger>How the pieces fit together</AccordionTrigger>
            <AccordionContent>
              <p>
                You use this site to configure autoresponders (Make.com webhooks), manage lists, and build drip campaigns.
                A <strong className="text-foreground">separate scheduler</strong> (for example cron-job.org) calls this
                app about once per minute. Each run claims due leads, signs payloads, posts to Make, and records outcomes
                so dashboards and audit logs stay truthful.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cron">
            <AccordionTrigger>Timer stopped or misconfigured</AccordionTrigger>
            <AccordionContent>
              <p>
                Open{" "}
                <Link href="/settings/cron" className="text-primary underline-offset-4 hover:underline">
                  Settings → Timer
                </Link>{" "}
                and verify the URL, secret, and one-minute cadence. If{" "}
                <Link href="/api/health" className="text-primary underline-offset-4 hover:underline">
                  /api/health
                </Link>{" "}
                reports stale ticks, nothing will send until the scheduler reaches the app again.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="schedule">
            <AccordionTrigger>Scheduling, quiet hours, and caps</AccordionTrigger>
            <AccordionContent>
              <p>
                Campaigns use a feels-human spread across your window. Quiet hours pause placement inside the chosen
                IANA timezone. Autoresponder daily caps (and optional warmup curves) may extend the computed end time so
                bursts stay compliant.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="first-campaign">
            <AccordionTrigger>Your first campaign</AccordionTrigger>
            <AccordionContent>
              <ol className="list-inside list-decimal space-y-2">
                <li>Create an autoresponder with the Make webhook URL and HMAC secret.</li>
                <li>Run the wizard: leads → schedule → tag.</li>
                <li>Use validation cards and optional dry schedule (step 5) before saving a preview.</li>
                <li>On the preview page, optionally send three test webhooks, then launch.</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="worker">
            <AccordionTrigger>Worker, ticks, and idempotency</AccordionTrigger>
            <AccordionContent>
              <p>
                The sender is <strong className="text-foreground">at-least-once</strong>: overlapping ticks, retries,
                or manual replays can attempt the same lead twice. Treat webhook payloads as idempotent in Make (for
                example dedupe on lead id + campaign id). Slow ticks (over 25 seconds) are flagged in{" "}
                <code>tick_log.slow</code>
                ; <code>last_successful_tick_at</code> in settings tracks healthy completions separately from failed
                attempts.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="make">
            <AccordionTrigger>Make.com checklist</AccordionTrigger>
            <AccordionContent>
              <ul className="list-inside list-disc space-y-1">
                <li>One Make scenario per autoresponder row.</li>
                <li>
                  Verify HMAC before trusting JSON bodies:{" "}
                  <code className="text-foreground">
                    sha256(1.lead_id + &quot;|&quot; + 1.campaign_id + &quot;|&quot; + 1.email; &quot;hex&quot;;
                    secret)
                  </code>{" "}
                  must equal top-level <code className="text-foreground">signature</code> (map from webhook root,
                  not custom_fields).
                </li>
                <li>Return non-success when your ESP rejects a lead so this app can retry with backoff.</li>
                <li>Keep scenarios fast — pacing lives here.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="csv">
            <AccordionTrigger>CSV imports and column maps</AccordionTrigger>
            <AccordionContent>
              <p>
                Master import and campaign wizards accept CSV merges. Saved maps live under{" "}
                <Link href="/templates/csv-mappings" className="text-primary underline-offset-4 hover:underline">
                  CSV column mappings
                </Link>
                .
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="secrets">
            <AccordionTrigger>Secret rotation</AccordionTrigger>
            <AccordionContent>
              <p>
                Rotate the timer token and webhook secrets from hosting settings and Make modules together. After
                rotation, update the autoresponder secret in this app so signatures continue to match.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="backups">
            <AccordionTrigger>Backups and snapshots</AccordionTrigger>
            <AccordionContent>
              <p>
                Supabase retains database backups on paid tiers. Optional JSON snapshots can land in the{" "}
                <code>app-backups</code> bucket via the signed cron URL on the timer page — use them as a secondary
                export, not a substitute for database PITR.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="glossary">
            <AccordionTrigger>Glossary</AccordionTrigger>
            <AccordionContent>
              <dl className="space-y-2">
                <dt className="font-medium text-foreground">Tick</dt>
                <dd>One execution of the sender worker.</dd>
                <dt className="font-medium text-foreground">Previewing</dt>
                <dd>Campaign saved with pending leads but not yet moved to running.</dd>
                <dt className="font-medium text-foreground">Dry run (launch)</dt>
                <dd>Marks sends without HTTP to Make — only for counter/timing drills after launch.</dd>
              </dl>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="troubleshoot">
            <AccordionTrigger>Troubleshooting</AccordionTrigger>
            <AccordionContent>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong className="text-foreground">401 on /api/tick</strong> — token mismatch between scheduler and{" "}
                  <code>CRON_TOKEN</code>.
                </li>
                <li>
                  <strong className="text-foreground">Health stale</strong> — no successful tick recently; check hosting
                  logs and Make errors.
                </li>
                <li>
                  <strong className="text-foreground">429 rate limit</strong> — too many requests per minute from one
                  IP; wait for Retry-After seconds.
                </li>
              </ul>
              <p className="pt-3">
                <Link href="/settings/danger" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  Danger zone
                </Link>{" "}
                hosts destructive maintenance — read warnings carefully.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <HelpFeedback section="help_overview" />
      </div>
    </>
  );
}
