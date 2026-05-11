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
    body: "Counts campaigns that are running, scheduled, or paused — anything that could still produce sends.",
  },
  "dashboard.sentToday": {
    title: "Sent today",
    body: "UTC-midnight to now: successful webhook deliveries recorded on lead rows.",
  },
  "dashboard.failed24": {
    title: "Failed (24h)",
    body: "Leads that entered failed status in the last 24 hours (after retries exhausted).",
  },
  "dashboard.lastTick": {
    title: "Last tick",
    body: "When the background sender last ran. If this time is old, your external timer or site address may be misconfigured.",
  },
  "dashboard.makeOps": {
    title: "Make operations",
    body: "Rough monthly Make usage estimate (2 ops per successful send heuristic). Compare to your Make plan and settings limit.",
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
  "audit.row": {
    title: "Audit entry",
    body: "Immutable record of a mutating action — export CSV for compliance reviews.",
  },
  "csv.fieldMap": {
    title: "CSV field map",
    body: "Paste a JSON object: keys are spreadsheet column headings (exact text), values are field names in this app (email, first_name, last_name, or any custom key).",
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
    body: "Shared secret used to sign outbound JSON (SHA-256 HMAC). Mirror the verification step inside Make before trusting the payload.",
  },
  "ar.dailyCap": {
    title: "Daily send cap",
    body: "Optional ceiling on successful sends per UTC day for this AR across all campaigns. The scheduler may extend the campaign window so bursts respect this cap.",
  },
  "ar.warmup": {
    title: "Warmup",
    body: "When enabled, daily caps ramp using the warmup curve on the autoresponder — protects a cold domain/list.",
  },
} as const;

export type TooltipId = keyof typeof TOOLTIPS;
