"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";

export async function updatePreferencesAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const tooltips = formData.get("tooltips_enabled") === "on";
  const defaultTz = String(formData.get("default_tz") ?? "").trim() || "Europe/Vienna";

  const { error } = await sb
    .from("settings")
    .update({ tooltips_enabled: tooltips, default_tz: defaultTz })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "settings_preferences_updated",
    entityType: "settings",
    entityId: null,
    details: { tooltips_enabled: tooltips, default_tz: defaultTz },
  });

  revalidatePath("/settings/preferences");
  revalidatePath("/");
}

export async function updateAlertsAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const telegram_bot_token = String(formData.get("telegram_bot_token") ?? "").trim() || null;
  const telegram_chat_id = String(formData.get("telegram_chat_id") ?? "").trim() || null;
  const alert_email = String(formData.get("alert_email") ?? "").trim() || null;

  const { error } = await sb
    .from("settings")
    .update({
      telegram_bot_token,
      telegram_chat_id,
      alert_email,
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "settings_alerts_updated",
    entityType: "settings",
    entityId: null,
    details: { has_telegram: Boolean(telegram_bot_token && telegram_chat_id), has_email: Boolean(alert_email) },
  });

  revalidatePath("/settings/alerts");
}

export async function updateRandomizationAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const { data: cur, error: rErr } = await sb.from("settings").select("randomization_settings").eq("id", 1).single();
  if (rErr) throw new Error(rErr.message);

  const base = (cur?.randomization_settings as Record<string, unknown> | null) ?? {};
  const next: Record<string, unknown> = { ...base };

  const mpt = Number(formData.get("max_per_tick_default"));
  if (Number.isFinite(mpt)) next.max_per_tick_default = Math.min(10, Math.max(1, Math.round(mpt)));

  const gap = Number(formData.get("gap_probability_floor"));
  if (Number.isFinite(gap)) next.gap_probability_floor = Math.min(0.55, Math.max(0.05, gap));

  const b2 = Number(formData.get("burst_probability_2"));
  if (Number.isFinite(b2)) next.burst_probability_2 = Math.min(0.6, Math.max(0.05, b2));

  const b3 = Number(formData.get("burst_probability_3"));
  if (Number.isFinite(b3)) next.burst_probability_3 = Math.min(0.35, Math.max(0.01, b3));

  const jitter = String(formData.get("intra_bucket_jitter") ?? "uniform").trim();
  if (jitter === "uniform" || jitter === "beta") next.intra_bucket_jitter = jitter;

  const { error } = await sb.from("settings").update({ randomization_settings: next }).eq("id", 1);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "settings_randomization_updated",
    entityType: "settings",
    entityId: null,
    details: { keys: Object.keys(next) },
  });

  revalidatePath("/settings/randomization");
}
