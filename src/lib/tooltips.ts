/** Static copy for contextual help (Preferences can hide all). */
export const TOOLTIPS = {
  "campaign.tag": {
    title: "Campaign tag",
    body: "Unique id sent to Make with each lead. Reuse is blocked across campaigns so automations stay isolated.",
  },
  "campaign.quiet": {
    title: "Quiet hours",
    body: "Sends are not scheduled during this local window; the drip spreads across the remaining minutes in your time window.",
  },
  "campaign.mpt": {
    title: "Max sends per check",
    body: "Caps how many leads from this campaign may send each time the background worker runs, together with the global batch limit.",
  },
  "campaign.dryRun": {
    title: "Dry run",
    body: "When enabled, marks leads as sent without calling Make — only for testing counters and timing.",
  },
  "cron.tick": {
    title: "Tick endpoint",
    body: "Your scheduler should call GET on this URL every minute with the shared secret so due leads are claimed and posted to Make.",
  },
  "leads.import": {
    title: "CSV intake",
    body: "Pick the email column, check addresses against your suppression list and inbox providers, then save good rows to your master list for reuse.",
  },
  "dashboard.active": {
    title: "Active campaigns",
    body: "Campaigns currently in flight: running, scheduled, or paused — anything that could still produce sends.",
  },
  "dashboard.sentToday": {
    title: "Sent today",
    body: "Leads delivered to Make.com today (UTC midnight to now).",
  },
  "dashboard.failed24": {
    title: "Failed (24h)",
    body: "Leads that failed after all retries in the last 24 hours.",
  },
  "dashboard.leadsInFlight": {
    title: "Leads in flight",
    body: "Rows still waiting to send or currently being handed off to Make.com.",
  },
  "dashboard.tickGap": {
    title: "Tick gap",
    body: "Longest gap between worker runs in the last hour. Large gaps mean your scheduler or /api/tick is not firing every minute.",
  },
  "dashboard.lastTick": {
    title: "Last tick",
    body: "When the worker last ran. If this time is old, your external timer or site address may be misconfigured.",
  },
  "dashboard.makeOps": {
    title: "Make operations",
    body: "Rough estimate for this calendar month: about two Make.com operations per successful send. Compare to your plan and the limit in Preferences.",
  },
  "wizard.name": {
    title: "Campaign name",
    body: "Internal label for you — not sent to subscribers. Keep it recognizable when you run many drips.",
  },
  "wizard.sourceLabel": {
    title: "Source label",
    body: "A short note saved with each address (for example the list name) so you can tell where it came from.",
  },
  "wizard.template": {
    title: "Template",
    body: "Applies saved pacing defaults from Campaign templates — you can still tweak every field afterward.",
  },
  "wizard.ar": {
    title: "Autoresponder",
    body: "Each AR has its own Make webhook URL and HMAC secret. One Make scenario should map to exactly one AR row.",
  },
  "wizard.leads": {
    title: "Lead paste",
    body: "One email per line or merge from CSV. MX + suppression checks run when you build the preview.",
  },
  "wizard.csvArchive": {
    title: "Archive CSV",
    body: "Optional copy of the raw file stored securely for your records — separate from the email list you paste.",
  },
  "wizard.window": {
    title: "Time window",
    body: "Hours between first and last scheduled send. Daily autoresponder caps may extend the computed end time automatically.",
  },
  "wizard.start": {
    title: "Start time",
    body: "First eligible minute for sends (interpreted in your quiet-hours timezone).",
  },
  "wizard.tz": {
    title: "Timezone",
    body: "IANA zone used for quiet-hour evaluation, e.g. Europe/Vienna.",
  },
  "preview.chart": {
    title: "Pacing chart",
    body: "Per-hour counts inside the scheduling window — use it to spot spikes before you launch.",
  },
  "settings.random": {
    title: "Randomization",
    body: "Global defaults for gap/burst probabilities and intra-bucket jitter used when building new schedules.",
  },
  "settings.random.mptDefault": {
    title: "Max sends per worker check (default)",
    body: "Upper bound on how many sends can land in the same clock hour inside your time window. The campaign wizard sets a per-campaign cap too; the scheduler uses the lower of the two when building timestamps.",
  },
  "settings.random.gapFloor": {
    title: "Gap probability floor",
    body: "Raises the minimum chance of a “quiet” hour (zero sends in that hour bucket). Higher values add more breathing room between bursts so the drip looks less robotic.",
  },
  "settings.random.burst2": {
    title: "Burst ×2 probability",
    body: "How often the scheduler may pack two sends into the same hour bucket when the draw picks a burst. Increase slightly for lumpier, more human pacing; decrease for smoother hourly counts.",
  },
  "settings.random.burst3": {
    title: "Burst ×3 probability",
    body: "Chance of a triple-send hour when workload and averages allow it. Keep this small — noticeable spikes should be rare compared with ×2 bursts.",
  },
  "settings.random.intraJitter": {
    title: "Intra-bucket jitter",
    body: "How send times are scattered across the seconds inside each minute: uniform spreads evenly, triangle favors mid-minute, beta clusters nearer the start of the minute bucket.",
  },
  "audit.row": {
    title: "Audit entry",
    body: "Immutable record of a mutating action — export CSV for compliance reviews.",
  },
  "csv.fieldMap": {
    title: "CSV field map",
    body: "Save how spreadsheet column headings map to email and name fields so the next import from the same file layout skips the mapping step.",
  },
  "scope.v11": {
    title: "Planned improvements",
    body: "Features like bounce handling, tighter security lists, and multi-user sign-in are tracked for later releases — see Help for the full picture.",
  },
  "ar.webhook": {
    title: "Make webhook URL",
    body: "Paste the HTTPS URL from your Make custom webhook module. Each autoresponder should map 1:1 to a dedicated scenario.",
  },
  "ar.hmac": {
    title: "Webhook secret",
    body: "Shared secret used to sign outbound JSON (HMAC-SHA256 over lead_id | campaign_id | email | timestamp, with spaces around pipes). Mirror the same concat in Make before trusting the payload.",
  },
  "ar.dailyCap": {
    title: "Daily send cap",
    body: "Optional ceiling on successful sends per UTC day for this AR across all campaigns. The scheduler may extend the campaign window so bursts respect this cap.",
  },
  "ar.warmup": {
    title: "Warmup",
    body: "When enabled, daily caps ramp using the warmup curve on the autoresponder — protects a cold domain/list.",
  },
  "preview.arEmail": {
    title: "Destination account",
    body: "The autoresponder row’s account email label — Make still receives the webhook payload keyed by tag and lead id.",
  },
  "preview.firstSends": {
    title: "First sends",
    body: "Earliest scheduled rows after suppression and MX filtering — sanity-check spacing before launch or test posts.",
  },
  "preview.testSend": {
    title: "Test send",
    body: "Posts the first three pending leads to Make immediately so you can verify the scenario before the timer takes over.",
  },
  "wizard.dryRunSchedule": {
    title: "Dry schedule",
    body: "Computes the same feels-human timeline as a real preview but does not create a campaign or save leads in the database.",
  },
  "wizard.leadLimit": {
    title: "How many to schedule",
    body: "Caps how many MX-eligible unique addresses are included in the preview and launch — cannot exceed the eligible count from validation.",
  },
  "wizard.validation": {
    title: "Validation report",
    body: "Suppression, syntax, duplicate-in-file, and inbox-provider checks mirror the import flow so you know what will drop before scheduling.",
  },
  "suppression.csv": {
    title: "CSV upload",
    body: "Bulk-add suppressed addresses from a spreadsheet with an email column — counts new vs already listed vs invalid rows.",
  },
  "dashboard.activeTable": {
    title: "Active table",
    body: "Campaigns that can still produce sends. Pause stops new claims; resume shifts pending times forward by the pause duration.",
  },
  "dashboard.arCapBars": {
    title: "Daily caps",
    body: "Successful sends today (UTC) versus the effective cap for each autoresponder including warmup curves.",
  },
  "dashboard.tickSpark": {
    title: "Tick spacing",
    body: "Time between consecutive worker runs. Gaps over three minutes usually mean the external scheduler or hosting is misconfigured.",
  },
  "dashboard.failures": {
    title: "Failures list",
    body: "Leads that exhausted retries — inspect Make.com logs using the campaign id and email shown here.",
  },
  "dashboard.lastSuccess": {
    title: "Last successful tick",
    body: "Heartbeat when the worker finished a healthy pass — distinct from attempts that errored before completion.",
  },
  "help.feedback": {
    title: "Helpfulness",
    body: "Anonymous thumbs stored in the audit log so we know which help sections need work.",
  },
  "worker.idempotency": {
    title: "At-least-once ticks",
    body: "If a tick overlaps retries or your scheduler fires twice, the same lead might be attempted more than once — Make should treat webhook ids as idempotent where possible.",
  },
} as const;

export type TooltipId = keyof typeof TOOLTIPS;
