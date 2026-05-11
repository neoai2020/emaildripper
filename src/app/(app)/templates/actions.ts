"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";

export async function createCampaignTemplateAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");
  const ar = String(formData.get("autoresponder_id") ?? "").trim();
  const time_window_hours = Number(formData.get("time_window_hours") ?? 48);
  const max_concurrent_per_tick = Number(formData.get("max_concurrent_per_tick") ?? 3);
  const quiet_hours_enabled = formData.get("quiet_hours_enabled") === "on";
  const quiet_hours_start = String(formData.get("quiet_hours_start") ?? "01:00").trim() || null;
  const quiet_hours_end = String(formData.get("quiet_hours_end") ?? "06:00").trim() || null;
  const daily_cap_raw = String(formData.get("daily_cap") ?? "").trim();
  const daily_cap = daily_cap_raw ? Number(daily_cap_raw) : null;

  const { data, error } = await sb
    .from("campaign_templates")
    .insert({
      name,
      autoresponder_id: ar && ar !== "none" ? ar : null,
      time_window_hours: Number.isFinite(time_window_hours) ? time_window_hours : 48,
      max_concurrent_per_tick: Number.isFinite(max_concurrent_per_tick)
        ? Math.min(10, Math.max(1, Math.round(max_concurrent_per_tick)))
        : 3,
      quiet_hours_enabled,
      quiet_hours_start: quiet_hours_enabled ? quiet_hours_start : null,
      quiet_hours_end: quiet_hours_enabled ? quiet_hours_end : null,
      daily_cap: daily_cap != null && Number.isFinite(daily_cap) ? Math.round(daily_cap) : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "campaign_template_created",
    entityType: "campaign_template",
    entityId: data.id,
    details: { name },
  });
  revalidatePath("/templates/campaigns");
}

export async function deleteCampaignTemplateAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");
  const { error } = await sb.from("campaign_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "campaign_template_deleted",
    entityType: "campaign_template",
    entityId: id,
    details: {},
  });
  revalidatePath("/templates/campaigns");
}

export async function createCsvMappingAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const name = String(formData.get("name") ?? "").trim();
  const raw = String(formData.get("field_map_json") ?? "").trim();
  if (!name) throw new Error("Name is required.");
  let field_map: Record<string, unknown> = {};
  try {
    field_map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    throw new Error("That column map could not be read. Check brackets and commas, then try again.");
  }

  const { data, error } = await sb
    .from("csv_column_mappings")
    .insert({ name, field_map })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "csv_mapping_created",
    entityType: "csv_column_mapping",
    entityId: data.id,
    details: { name },
  });
  revalidatePath("/templates/csv-mappings");
}

export async function deleteCsvMappingAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");
  const { error } = await sb.from("csv_column_mappings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "csv_mapping_deleted",
    entityType: "csv_column_mapping",
    entityId: id,
    details: {},
  });
  revalidatePath("/templates/csv-mappings");
}
