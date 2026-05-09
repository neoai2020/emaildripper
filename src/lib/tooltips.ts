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
    title: "Max per tick",
    body: "Caps how many leads this campaign may send per cron run, combined with the worker batch limit.",
  },
  "cron.tick": {
    title: "Tick endpoint",
    body: "Your scheduler should call GET on this URL every minute with the shared secret so due leads are claimed and posted to Make.",
  },
  "leads.import": {
    title: "CSV intake",
    body: "Parse locally, map the email column, run MX/suppression checks, then upsert into master leads for reuse in campaigns.",
  },
} as const;

export type TooltipId = keyof typeof TOOLTIPS;
