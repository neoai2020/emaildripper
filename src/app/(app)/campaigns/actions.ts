"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";
import { validateEmailMx } from "@/lib/mx/lookup";
import { launchCampaignSchema, type LaunchCampaignInput } from "@/lib/schemas/campaign";
import { buildFeelsHumanSchedule } from "@/lib/scheduler/feelsHuman";
import { isValidEmailSyntax, normalizeEmail } from "@/lib/validation/email";

async function ensureMasterLeadIds(
  sb: ReturnType<typeof requireServiceSupabase>,
  emails: string[],
  sourceLabel?: string | null
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(emails.map(normalizeEmail)));

  const rows = unique.map((email) => ({
    email,
    source_label: sourceLabel ?? null,
  }));

  const { error: upErr } = await sb.from("master_leads").upsert(rows, { onConflict: "email" });
  if (upErr) throw new Error(upErr.message);

  const { data, error } = await sb.from("master_leads").select("id,email").in("email", unique);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    map.set(row.email, row.id);
  }
  return map;
}

export async function launchCampaignAction(raw: LaunchCampaignInput): Promise<{ campaignId: string }> {
  const input = launchCampaignSchema.parse(raw);
  const sb = requireServiceSupabase();

  const { data: ar, error: arErr } = await sb
    .from("autoresponders")
    .select("id,name,is_active")
    .eq("id", input.autoresponderId)
    .maybeSingle();
  if (arErr) throw new Error(arErr.message);
  if (!ar || !ar.is_active) throw new Error("Autoresponder not found or inactive.");

  const { data: tagClash } = await sb.from("campaigns").select("id").eq("tag", input.tag).maybeSingle();
  if (tagClash) throw new Error("That tag is already used by another campaign.");

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

  const startsAt = new Date(input.startsAtIso);
  if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid startsAt");

  const endsAt = new Date(startsAt.getTime() + input.timeWindowHours * 3600_000);

  const schedule = buildFeelsHumanSchedule({
    count: withMx.length,
    windowStart: startsAt,
    windowEnd: endsAt,
    timeZone: input.quietTz,
    quietHoursEnabled: input.quietHoursEnabled,
    quietStart: input.quietStart,
    quietEnd: input.quietEnd,
    maxPerBucket: input.maxConcurrentPerTick,
  });

  if (schedule.length !== withMx.length) {
    throw new Error(`Scheduler mismatch (${schedule.length} vs ${withMx.length}).`);
  }

  const masterByEmail = await ensureMasterLeadIds(sb, withMx, input.sourceLabel ?? null);

  const { data: campaign, error: cErr } = await sb
    .from("campaigns")
    .insert({
      name: input.name,
      autoresponder_id: input.autoresponderId,
      tag: input.tag,
      status: "running",
      total_leads: withMx.length,
      sent_count: 0,
      failed_count: 0,
      time_window_hours: input.timeWindowHours,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      original_ends_at: endsAt.toISOString(),
      randomization_mode: "feels_human",
      max_concurrent_per_tick: input.maxConcurrentPerTick,
      quiet_hours_enabled: input.quietHoursEnabled,
      quiet_hours_start: input.quietHoursEnabled ? input.quietStart : null,
      quiet_hours_end: input.quietHoursEnabled ? input.quietEnd : null,
      quiet_hours_tz: input.quietTz,
      source_label: input.sourceLabel ?? null,
      launched_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (cErr) throw new Error(cErr.message);

  const campaignId = campaign.id as string;

  const leadRows = withMx.map((email, idx) => ({
    campaign_id: campaignId,
    master_lead_id: masterByEmail.get(email) ?? null,
    email,
    scheduled_at: schedule[idx]!.toISOString(),
    status: "pending" as const,
  }));

  const chunk = 500;
  for (let i = 0; i < leadRows.length; i += chunk) {
    const slice = leadRows.slice(i, i + chunk);
    const { error: insErr } = await sb.from("campaign_leads").insert(slice);
    if (insErr) throw new Error(insErr.message);
  }

  await writeAuditLog({
    action: "campaign_launched",
    entityType: "campaign",
    entityId: campaignId,
    details: { tag: input.tag, leads: withMx.length },
  });

  revalidatePath("/campaigns");
  revalidatePath("/");
  revalidatePath(`/campaigns/${campaignId}`);
  return { campaignId };
}

export async function pauseCampaignAction(campaignId: string) {
  const sb = requireServiceSupabase();
  const { error } = await sb
    .from("campaigns")
    .update({ status: "paused", paused_at: new Date().toISOString() })
    .eq("id", campaignId)
    .in("status", ["running", "scheduled"]);
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "campaign_paused",
    entityType: "campaign",
    entityId: campaignId,
    details: {},
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function resumeCampaignAction(campaignId: string) {
  const sb = requireServiceSupabase();
  const { data: c, error } = await sb
    .from("campaigns")
    .select("paused_at")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!c?.paused_at) throw new Error("Campaign is not paused.");

  const shiftMs = Date.now() - new Date(c.paused_at).getTime();

  const { data: pending, error: pErr } = await sb
    .from("campaign_leads")
    .select("id,scheduled_at")
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  if (pErr) throw new Error(pErr.message);

  for (const row of pending ?? []) {
    const next = new Date(new Date(row.scheduled_at).getTime() + shiftMs).toISOString();
    const { error: uErr } = await sb.from("campaign_leads").update({ scheduled_at: next }).eq("id", row.id);
    if (uErr) throw new Error(uErr.message);
  }

  const { error: u2 } = await sb
    .from("campaigns")
    .update({ status: "running", paused_at: null })
    .eq("id", campaignId);
  if (u2) throw new Error(u2.message);

  await writeAuditLog({
    action: "campaign_resumed",
    entityType: "campaign",
    entityId: campaignId,
    details: { shift_ms: shiftMs },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function cancelCampaignAction(campaignId: string) {
  const sb = requireServiceSupabase();
  const { error: u1 } = await sb
    .from("campaign_leads")
    .update({ status: "skipped_cancelled" })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  if (u1) throw new Error(u1.message);

  const { error: u2 } = await sb
    .from("campaigns")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (u2) throw new Error(u2.message);

  await writeAuditLog({
    action: "campaign_cancelled",
    entityType: "campaign",
    entityId: campaignId,
    details: {},
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}
