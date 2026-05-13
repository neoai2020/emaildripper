"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";
import { launchCampaignSchema, type LaunchCampaignInput } from "@/lib/schemas/campaign";
import { computeCampaignSchedule } from "@/lib/campaign/computeSchedule";
import { postSignedMakeLead, signMakePayload } from "@/lib/make-webhook";
import { validateEmailMx } from "@/lib/mx/lookup";
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

async function insertCampaignWithLeads(
  input: LaunchCampaignInput,
  status: "previewing" | "running"
): Promise<{ campaignId: string; leadCount: number }> {
  const sb = requireServiceSupabase();

  const { data: tagClash } = await sb.from("campaigns").select("id").eq("tag", input.tag).maybeSingle();
  if (tagClash) throw new Error("That tag is already used by another campaign.");

  const { withMx, schedule, endsAt, originalEndsAt } = await computeCampaignSchedule(sb, {
    autoresponderId: input.autoresponderId,
    emails: input.emails,
    timeWindowHours: input.timeWindowHours,
    startsAtIso: input.startsAtIso,
    quietHoursEnabled: input.quietHoursEnabled,
    quietStart: input.quietStart,
    quietEnd: input.quietEnd,
    quietTz: input.quietTz,
    maxConcurrentPerTick: input.maxConcurrentPerTick,
    scheduleLeadLimit: input.scheduleLeadLimit ?? null,
  });

  const startsAt = new Date(input.startsAtIso);

  const masterByEmail = await ensureMasterLeadIds(sb, withMx, input.sourceLabel ?? null);

  const { data: campaign, error: cErr } = await sb
    .from("campaigns")
    .insert({
      name: input.name,
      autoresponder_id: input.autoresponderId,
      tag: input.tag,
      status,
      total_leads: withMx.length,
      sent_count: 0,
      failed_count: 0,
      time_window_hours: input.timeWindowHours,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      original_ends_at: originalEndsAt.toISOString(),
      randomization_mode: "feels_human",
      max_concurrent_per_tick: input.maxConcurrentPerTick,
      quiet_hours_enabled: input.quietHoursEnabled,
      quiet_hours_start: input.quietHoursEnabled ? input.quietStart : null,
      quiet_hours_end: input.quietHoursEnabled ? input.quietEnd : null,
      quiet_hours_tz: input.quietTz,
      source_label: input.sourceLabel ?? null,
      source_csv_path: input.sourceCsvPath?.trim() || null,
      launched_at: status === "running" ? new Date().toISOString() : null,
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

  return { campaignId, leadCount: withMx.length };
}

export async function createPreviewCampaignAction(
  raw: LaunchCampaignInput
): Promise<{ campaignId: string }> {
  const input = launchCampaignSchema.parse(raw);
  const { campaignId, leadCount } = await insertCampaignWithLeads(input, "previewing");

  await writeAuditLog({
    action: "campaign_preview_created",
    entityType: "campaign",
    entityId: campaignId,
    details: { tag: input.tag, leads: leadCount, schedule_lead_limit: input.scheduleLeadLimit ?? null },
  });

  revalidatePath("/campaigns");
  revalidatePath("/");
  revalidatePath(`/campaigns/${campaignId}`);
  return { campaignId };
}

/** Direct launch (running) — kept for scripts or future “skip preview” flows. */
export async function launchCampaignAction(raw: LaunchCampaignInput): Promise<{ campaignId: string }> {
  const input = launchCampaignSchema.parse(raw);
  const { campaignId, leadCount } = await insertCampaignWithLeads(input, "running");

  await writeAuditLog({
    action: "campaign_launched",
    entityType: "campaign",
    entityId: campaignId,
    details: { tag: input.tag, leads: leadCount },
  });

  revalidatePath("/campaigns");
  revalidatePath("/");
  revalidatePath(`/campaigns/${campaignId}`);
  return { campaignId };
}

export async function activatePreviewCampaignAction(campaignId: string, formData?: FormData) {
  const dryRun =
    formData?.get("dry_run") === "on" ||
    formData?.get("dry_run") === "true" ||
    formData?.get("dry_run") === "1";

  const sb = requireServiceSupabase();
  const { data: row, error: gErr } = await sb
    .from("campaigns")
    .select("id,status")
    .eq("id", campaignId)
    .maybeSingle();
  if (gErr) throw new Error(gErr.message);
  if (!row || row.status !== "previewing") {
    throw new Error("Campaign is not in preview state.");
  }

  const launchedAt = new Date().toISOString();
  const withDryRun = {
    status: "running" as const,
    launched_at: launchedAt,
    dry_run: dryRun,
  };
  const withoutDryRun = { status: "running" as const, launched_at: launchedAt };

  let { error } = await sb.from("campaigns").update(withDryRun).eq("id", campaignId).eq("status", "previewing");
  if (
    error &&
    (error.message.toLowerCase().includes("dry_run") || error.code === "42703")
  ) {
    ({ error } = await sb
      .from("campaigns")
      .update(withoutDryRun)
      .eq("id", campaignId)
      .eq("status", "previewing"));
  }
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "campaign_launched",
    entityType: "campaign",
    entityId: campaignId,
    details: { from: "preview", dry_run: dryRun },
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/preview`);
}

export async function discardPreviewCampaignAction(campaignId: string, formData?: FormData) {
  void formData;
  const sb = requireServiceSupabase();
  const { data: row, error: gErr } = await sb
    .from("campaigns")
    .select("id,status")
    .eq("id", campaignId)
    .maybeSingle();
  if (gErr) throw new Error(gErr.message);
  if (!row || row.status !== "previewing") {
    throw new Error("Only preview campaigns can be discarded.");
  }

  const { error } = await sb.from("campaigns").delete().eq("id", campaignId).eq("status", "previewing");
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "campaign_preview_discarded",
    entityType: "campaign",
    entityId: campaignId,
    details: {},
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}/preview`);
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

  const { data: endsRow } = await sb.from("campaigns").select("ends_at").eq("id", campaignId).maybeSingle();
  const { data: maxPending } = await sb
    .from("campaign_leads")
    .select("scheduled_at")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (endsRow?.ends_at && maxPending?.scheduled_at) {
    const endT = new Date(endsRow.ends_at as string).getTime();
    const maxT = new Date(maxPending.scheduled_at as string).getTime();
    if (maxT > endT) {
      await sb.from("campaigns").update({ ends_at: maxPending.scheduled_at }).eq("id", campaignId);
    }
  }

  await writeAuditLog({
    action: "campaign_resumed",
    entityType: "campaign",
    entityId: campaignId,
    details: { shift_ms: shiftMs },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function cancelCampaignAction(campaignId: string, formData: FormData) {
  if (String(formData.get("confirm")) !== "CANCEL") {
    throw new Error('Type exactly "CANCEL" in the confirmation field to stop this campaign.');
  }
  const sb = requireServiceSupabase();
  const purgeAt = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
  const { error: u1 } = await sb
    .from("campaign_leads")
    .update({ status: "skipped_cancelled" })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  if (u1) throw new Error(u1.message);

  const { error: u2 } = await sb
    .from("campaigns")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), purge_at: purgeAt })
    .eq("id", campaignId);
  if (u2) throw new Error(u2.message);

  await writeAuditLog({
    action: "campaign_cancelled",
    entityType: "campaign",
    entityId: campaignId,
    details: { purge_at: purgeAt },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function undoCancelCampaignAction(campaignId: string) {
  const sb = requireServiceSupabase();
  const { data: c, error: gErr } = await sb
    .from("campaigns")
    .select("id,status,purge_at")
    .eq("id", campaignId)
    .maybeSingle();
  if (gErr) throw new Error(gErr.message);
  if (!c || c.status !== "cancelled") throw new Error("Campaign is not cancelled.");
  if (c.purge_at) {
    const pur = new Date(c.purge_at as string).getTime();
    if (pur <= Date.now()) throw new Error("This campaign is past its recovery window.");
  }

  const { error: u1 } = await sb
    .from("campaign_leads")
    .update({ status: "pending" })
    .eq("campaign_id", campaignId)
    .eq("status", "skipped_cancelled");
  if (u1) throw new Error(u1.message);

  const { error: u2 } = await sb
    .from("campaigns")
    .update({ status: "paused", cancelled_at: null, purge_at: null, paused_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (u2) throw new Error(u2.message);

  await writeAuditLog({
    action: "campaign_cancel_undone",
    entityType: "campaign",
    entityId: campaignId,
    details: {},
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export type PreviewTestLeadResult = {
  email: string;
  ok: boolean;
  httpStatus: number;
  bodySnippet: string;
};

export async function sendPreviewTestLeadsAction(campaignId: string): Promise<PreviewTestLeadResult[]> {
  const sb = requireServiceSupabase();
  const { data: camp, error: cErr } = await sb
    .from("campaigns")
    .select("id,status,tag,autoresponder_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!camp || camp.status !== "previewing") {
    throw new Error("Test sends are only available while the campaign is in preview.");
  }

  const { data: ar, error: aErr } = await sb
    .from("autoresponders")
    .select("make_webhook_url,webhook_secret,is_active")
    .eq("id", camp.autoresponder_id as string)
    .maybeSingle();
  if (aErr) throw new Error(aErr.message);
  if (!ar?.is_active) throw new Error("Autoresponder is inactive.");

  const { data: leads, error: lErr } = await sb
    .from("campaign_leads")
    .select("id,email,attempt_count,master_lead_id")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("scheduled_at", { ascending: true })
    .limit(3);
  if (lErr) throw new Error(lErr.message);
  const list = leads ?? [];
  if (list.length === 0) throw new Error("No pending leads to test.");

  const results: PreviewTestLeadResult[] = [];

  for (const lead of list) {
    const attempt = (lead.attempt_count ?? 0) + 1;
    const ts = new Date().toISOString();
    let first_name: string | null = null;
    let last_name: string | null = null;
    let custom_fields: Record<string, unknown> = {};
    if (lead.master_lead_id) {
      const { data: m } = await sb
        .from("master_leads")
        .select("first_name,last_name,custom_fields")
        .eq("id", lead.master_lead_id as string)
        .maybeSingle();
      if (m) {
        first_name = (m.first_name as string | null) ?? null;
        last_name = (m.last_name as string | null) ?? null;
        custom_fields = (m.custom_fields as Record<string, unknown>) ?? {};
      }
    }

    const body = signMakePayload(
      {
        email: lead.email as string,
        first_name,
        last_name,
        custom_fields,
        campaign_id: camp.id as string,
        campaign_tag: camp.tag as string,
        lead_id: lead.id as string,
        attempt,
        timestamp: ts,
      },
      ar.webhook_secret as string
    );

    const t0 = Date.now();
    const res = await postSignedMakeLead(ar.make_webhook_url as string, body);
    const durationMs = Date.now() - t0;
    const ok = res.status >= 200 && res.status < 300;

    await sb.from("campaign_lead_logs").insert({
      campaign_lead_id: lead.id,
      attempt_number: attempt,
      outcome: ok ? "success" : "failure",
      http_status: res.status || null,
      response_body: res.text,
      error_message: ok ? null : "non_2xx_or_timeout",
      duration_ms: durationMs,
    });

    if (ok) {
      await sb
        .from("campaign_leads")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          make_response_status: res.status,
          make_response_body: res.text,
          error_message: null,
          attempt_count: attempt,
        })
        .eq("id", lead.id);
      const { data: sc } = await sb.from("campaigns").select("sent_count").eq("id", campaignId).single();
      await sb
        .from("campaigns")
        .update({ sent_count: (sc?.sent_count ?? 0) + 1 })
        .eq("id", campaignId);
    } else {
      await sb
        .from("campaign_leads")
        .update({
          attempt_count: attempt,
          make_response_status: res.status || null,
          make_response_body: res.text,
          error_message: "preview_test_failed",
        })
        .eq("id", lead.id);
    }

    results.push({
      email: lead.email as string,
      ok,
      httpStatus: res.status,
      bodySnippet: res.text.slice(0, 240),
    });
  }

  await writeAuditLog({
    action: "campaign_preview_test_send",
    entityType: "campaign",
    entityId: campaignId,
    details: { count: results.length, ok: results.filter((r) => r.ok).length },
  });

  revalidatePath(`/campaigns/${campaignId}/preview`);
  revalidatePath(`/campaigns/${campaignId}`);
  return results;
}

export async function dryRunScheduleWizardAction(raw: LaunchCampaignInput) {
  const input = launchCampaignSchema.parse(raw);
  const sb = requireServiceSupabase();
  const { withMx, schedule, endsAt, originalEndsAt, mxFails, suppressed } = await computeCampaignSchedule(sb, {
    autoresponderId: input.autoresponderId,
    emails: input.emails,
    timeWindowHours: input.timeWindowHours,
    startsAtIso: input.startsAtIso,
    quietHoursEnabled: input.quietHoursEnabled,
    quietStart: input.quietStart,
    quietEnd: input.quietEnd,
    quietTz: input.quietTz,
    maxConcurrentPerTick: input.maxConcurrentPerTick,
    scheduleLeadLimit: input.scheduleLeadLimit ?? null,
  });

  const rows = withMx.map((email, idx) => ({
    email,
    scheduled_at: schedule[idx]!.toISOString(),
  }));

  return {
    rows,
    startsAt: input.startsAtIso,
    endsAt: endsAt.toISOString(),
    originalEndsAt: originalEndsAt.toISOString(),
    total: withMx.length,
    mxFailCount: mxFails.length,
    mxFailSample: mxFails.slice(0, 8),
    suppressedCount: suppressed.length,
    suppressedSample: suppressed.slice(0, 8),
  };
}

export type WizardLeadValidation = {
  total_non_empty_lines: number;
  valid_syntax_unique: number;
  duplicate_in_file: number;
  duplicate_sample: string[];
  suppressed: number;
  suppressed_sample: string[];
  mx_ok: number;
  mx_fail: number;
  mx_fail_sample: string[];
  eligible: number;
  eligible_sample: string[];
};

const MAX_VALIDATE_LINES = 5000;

export async function validateCampaignWizardLeadsAction(rawLines: string[]): Promise<WizardLeadValidation> {
  const lines = rawLines.slice(0, MAX_VALIDATE_LINES).map((l) => l.trim()).filter(Boolean);
  const total_non_empty_lines = lines.length;

  const normalizedOrdered: string[] = [];
  for (const line of lines) {
    const e = normalizeEmail(line.split(",")[0] ?? line);
    if (isValidEmailSyntax(e)) normalizedOrdered.push(e);
  }

  const seen = new Set<string>();
  const duplicate_sample: string[] = [];
  for (const e of normalizedOrdered) {
    if (seen.has(e)) {
      if (duplicate_sample.length < 8 && !duplicate_sample.includes(e)) duplicate_sample.push(e);
    } else {
      seen.add(e);
    }
  }
  const valid_syntax_unique = seen.size;
  const duplicate_in_file = normalizedOrdered.length - valid_syntax_unique;

  const unique = Array.from(seen);
  if (unique.length === 0) {
    return {
      total_non_empty_lines,
      valid_syntax_unique: 0,
      duplicate_in_file,
      duplicate_sample,
      suppressed: 0,
      suppressed_sample: [],
      mx_ok: 0,
      mx_fail: 0,
      mx_fail_sample: [],
      eligible: 0,
      eligible_sample: [],
    };
  }

  const sb = requireServiceSupabase();
  const { data: suppressedRows } = await sb.from("suppression_list").select("email").in("email", unique);
  const suppressedSet = new Set((suppressedRows ?? []).map((r) => r.email as string));
  const notSuppressed = unique.filter((e) => !suppressedSet.has(e));
  const suppressed_sample = unique.filter((e) => suppressedSet.has(e)).slice(0, 8);

  const mx_fail_sample: string[] = [];
  const mx_ok_list: string[] = [];
  for (const e of notSuppressed) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await validateEmailMx(e);
    if (ok) mx_ok_list.push(e);
    else if (mx_fail_sample.length < 8) mx_fail_sample.push(e);
  }

  return {
    total_non_empty_lines,
    valid_syntax_unique,
    duplicate_in_file,
    duplicate_sample,
    suppressed: unique.filter((e) => suppressedSet.has(e)).length,
    suppressed_sample,
    mx_ok: mx_ok_list.length,
    mx_fail: notSuppressed.length - mx_ok_list.length,
    mx_fail_sample,
    eligible: mx_ok_list.length,
    eligible_sample: mx_ok_list.slice(0, 8),
  };
}

/** PRD §8 — large list uploads */
const MAX_CSV_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function uploadCampaignCsvAction(formData: FormData): Promise<{ path: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a non-empty CSV file.");
  }
  if (file.size > MAX_CSV_UPLOAD_BYTES) {
    throw new Error("CSV file is too large (max 6 MB).");
  }

  const sb = requireServiceSupabase();
  const buf = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 96);
  const path = `campaigns/${Date.now()}-${safe}`;

  const { error } = await sb.storage.from("campaign-csv").upload(path, buf, {
    contentType: file.type && file.type !== "application/octet-stream" ? file.type : "text/csv",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "campaign_csv_uploaded",
    entityType: "storage",
    entityId: null,
    details: { path, bytes: buf.length },
  });

  return { path };
}

const CAMPAIGN_DELETABLE_STATUSES = new Set([
  "draft",
  "previewing",
  "completed",
  "failed",
  "cancelled",
]);

export async function deleteCampaignAction(id: string) {
  const sb = requireServiceSupabase();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("Invalid campaign id.");

  const { data: row, error: gErr } = await sb
    .from("campaigns")
    .select("id,status,name")
    .eq("id", parsed.data)
    .maybeSingle();
  if (gErr) throw new Error(gErr.message);
  if (!row) throw new Error("Campaign not found.");

  const st = String(row.status);
  if (!CAMPAIGN_DELETABLE_STATUSES.has(st)) {
    throw new Error(
      "This campaign is still scheduled, running, or paused. Cancel it (or wait until it finishes), then you can delete it.",
    );
  }

  const { error } = await sb.from("campaigns").delete().eq("id", parsed.data);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "campaign_deleted",
    entityType: "campaign",
    entityId: parsed.data,
    details: { name: row.name, status: st },
  });

  revalidatePath("/campaigns");
  revalidatePath("/");
  revalidatePath(`/campaigns/${parsed.data}`);
}
