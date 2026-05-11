import type { SupabaseClient } from "@supabase/supabase-js";

import type { LaunchCampaignInput } from "@/lib/schemas/campaign";
import { parseRandomizationSettings } from "@/lib/randomization-settings";
import { buildFeelsHumanSchedule } from "@/lib/scheduler/feelsHuman";
import { validateEmailMx } from "@/lib/mx/lookup";
import { isValidEmailSyntax, normalizeEmail } from "@/lib/validation/email";

export type ScheduleComputeInput = Pick<
  LaunchCampaignInput,
  | "autoresponderId"
  | "emails"
  | "timeWindowHours"
  | "startsAtIso"
  | "quietHoursEnabled"
  | "quietStart"
  | "quietEnd"
  | "quietTz"
  | "maxConcurrentPerTick"
> & {
  /** If set, only the first N eligible (post-MX) addresses are scheduled. */
  scheduleLeadLimit?: number | null;
};

export type ScheduleComputeResult = {
  withMx: string[];
  mxFails: string[];
  suppressed: string[];
  schedule: Date[];
  endsAt: Date;
  originalEndsAt: Date;
};

export async function computeCampaignSchedule(
  sb: SupabaseClient,
  input: ScheduleComputeInput
): Promise<ScheduleComputeResult> {
  const { data: ar, error: arErr } = await sb
    .from("autoresponders")
    .select("id,name,is_active,daily_cap")
    .eq("id", input.autoresponderId)
    .maybeSingle();
  if (arErr) throw new Error(arErr.message);
  if (!ar || !ar.is_active) throw new Error("Autoresponder not found or inactive.");

  const normalized = Array.from(
    new Set(input.emails.map((e) => normalizeEmail(e)).filter((e) => isValidEmailSyntax(e)))
  );
  if (normalized.length === 0) throw new Error("No valid emails after normalization.");

  const { data: suppressed, error: supErr } = await sb
    .from("suppression_list")
    .select("email")
    .in("email", normalized);
  if (supErr) throw new Error(supErr.message);
  const suppressedSet = new Set((suppressed ?? []).map((r) => r.email));
  const eligible = normalized.filter((e) => !suppressedSet.has(e));
  if (eligible.length === 0) throw new Error("All emails are suppressed.");

  const mxFails: string[] = [];
  const withMx: string[] = [];
  for (const e of eligible) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await validateEmailMx(e);
    if (ok) withMx.push(e);
    else mxFails.push(e);
  }
  if (withMx.length === 0) {
    throw new Error(`No emails passed MX validation. Sample failures: ${mxFails.slice(0, 5).join(", ")}`);
  }

  const limitRaw = input.scheduleLeadLimit;
  const limit =
    limitRaw != null && Number.isFinite(Number(limitRaw)) && Number(limitRaw) > 0
      ? Math.min(Number(limitRaw), withMx.length)
      : withMx.length;
  const useEmails = withMx.slice(0, limit);

  const startsAt = new Date(input.startsAtIso);
  if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid startsAt");

  let endsAt = new Date(startsAt.getTime() + input.timeWindowHours * 3600_000);
  const originalEndsAt = new Date(endsAt.getTime());

  const { data: settingsRow } = await sb
    .from("settings")
    .select("randomization_settings")
    .eq("id", 1)
    .maybeSingle();
  const rand = parseRandomizationSettings(settingsRow?.randomization_settings);

  const dailyCap = ar.daily_cap != null && Number.isFinite(Number(ar.daily_cap)) ? Number(ar.daily_cap) : null;
  const capActive = dailyCap != null && dailyCap > 0;

  let schedule: Date[] = [];
  let capSatisfied = !capActive;
  for (let iter = 0; iter < 400; iter++) {
    schedule = buildFeelsHumanSchedule({
      count: useEmails.length,
      windowStart: startsAt,
      windowEnd: endsAt,
      timeZone: input.quietTz,
      quietHoursEnabled: input.quietHoursEnabled,
      quietStart: input.quietStart,
      quietEnd: input.quietEnd,
      maxPerBucket: input.maxConcurrentPerTick,
      gapFloor: rand.gapFloor,
      burst2: rand.burst2,
      burst3: rand.burst3,
      intraBucketJitter: rand.intraBucketJitter,
    });

    if (schedule.length !== useEmails.length) {
      throw new Error(`Scheduler mismatch (${schedule.length} vs ${useEmails.length}).`);
    }

    if (!capActive) {
      capSatisfied = true;
      break;
    }

    const perDay = new Map<string, number>();
    let maxInDay = 0;
    for (const t of schedule) {
      const key = t.toISOString().slice(0, 10);
      const n = (perDay.get(key) ?? 0) + 1;
      perDay.set(key, n);
      if (n > maxInDay) maxInDay = n;
    }
    if (maxInDay <= dailyCap!) {
      capSatisfied = true;
      break;
    }
    endsAt = new Date(endsAt.getTime() + 24 * 3600_000);
  }

  if (!capSatisfied) {
    throw new Error(
      "Could not fit this many leads under the autoresponder daily cap — shorten the list, raise the cap, or widen the window."
    );
  }

  return {
    withMx: useEmails,
    mxFails,
    suppressed: normalized.filter((e) => suppressedSet.has(e)),
    schedule,
    endsAt,
    originalEndsAt,
  };
}
