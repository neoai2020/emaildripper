"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { DEFAULT_RANDOMIZATION_SETTINGS } from "@/lib/default-settings";
import { requireServiceSupabase } from "@/lib/db";

export async function deletePreviewCampaignsAction(formData: FormData) {
  if (String(formData.get("confirm")) !== "DELETE PREVIEWS") {
    throw new Error('Type exactly: DELETE PREVIEWS');
  }
  const sb = requireServiceSupabase();
  const { error } = await sb.from("campaigns").delete().eq("status", "previewing");
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "danger_delete_previews",
    entityType: "system",
    entityId: null,
    details: {},
  });
  revalidatePath("/campaigns");
}

export async function deleteAllCampaignsAction(formData: FormData) {
  if (String(formData.get("confirm")) !== "DELETE ALL CAMPAIGNS") {
    throw new Error('Type exactly: DELETE ALL CAMPAIGNS');
  }
  const sb = requireServiceSupabase();
  const { error } = await sb.from("campaigns").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "danger_delete_all_campaigns",
    entityType: "system",
    entityId: null,
    details: {},
  });
  revalidatePath("/campaigns");
  revalidatePath("/analytics");
}

export async function clearAuditLogAction(formData: FormData) {
  if (String(formData.get("confirm")) !== "CLEAR AUDIT LOG") {
    throw new Error('Type exactly: CLEAR AUDIT LOG');
  }
  const sb = requireServiceSupabase();
  const { error } = await sb.from("audit_log").delete().gte("at", "1970-01-01T00:00:00Z");
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "danger_audit_cleared",
    entityType: "system",
    entityId: null,
    details: { note: "log cleared; this row may be absent if insert fails after delete" },
  });
  revalidatePath("/audit-log");
}

export async function clearTickLogAction(formData: FormData) {
  if (String(formData.get("confirm")) !== "CLEAR TICK LOG") {
    throw new Error('Type exactly: CLEAR TICK LOG');
  }
  const sb = requireServiceSupabase();
  const { error } = await sb.from("tick_log").delete().gte("at", "1970-01-01T00:00:00Z");
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "danger_tick_log_cleared",
    entityType: "system",
    entityId: null,
    details: {},
  });
  revalidatePath("/analytics");
  revalidatePath("/");
}

export async function resetSettingsAction(formData: FormData) {
  if (String(formData.get("confirm")) !== "RESET SETTINGS") {
    throw new Error('Type exactly: RESET SETTINGS');
  }
  const sb = requireServiceSupabase();
  const { error } = await sb
    .from("settings")
    .update({
      tooltips_enabled: true,
      theme: "dark",
      default_tz: "Europe/Vienna",
      telegram_bot_token: null,
      telegram_chat_id: null,
      alert_email: null,
      randomization_settings: DEFAULT_RANDOMIZATION_SETTINGS,
      backup_retention_days: 365,
      failure_rate_alert_pct: 10,
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "danger_settings_reset",
    entityType: "settings",
    entityId: null,
    details: {},
  });
  revalidatePath("/settings");
  revalidatePath("/settings/preferences");
  revalidatePath("/settings/alerts");
  revalidatePath("/settings/randomization");
}
