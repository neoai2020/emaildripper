"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";

export async function updatePreferencesAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const tooltips = formData.get("tooltips_enabled") === "on";
  const defaultTz = String(formData.get("default_tz") ?? "").trim() || "Europe/Vienna";

  const tier = String(formData.get("make_ops_tier") ?? "custom").trim();
  const customRaw = Number(formData.get("make_ops_custom"));
  const presets: Record<string, number> = {
    free: 1000,
    core: 10_000,
    pro: 10_000,
    teams: 10_000,
  };
  let make_ops_monthly_limit: number | null = null;
  if (tier in presets) {
    make_ops_monthly_limit = presets[tier]!;
  } else if (Number.isFinite(customRaw) && customRaw > 0) {
    make_ops_monthly_limit = Math.min(10_000_000, Math.round(customRaw));
  }

  const { error } = await sb
    .from("settings")
    .update({
      tooltips_enabled: tooltips,
      default_tz: defaultTz,
      make_ops_monthly_limit,
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "settings_preferences_updated",
    entityType: "settings",
    entityId: null,
    details: { tooltips_enabled: tooltips, default_tz: defaultTz, make_ops_monthly_limit },
  });

  revalidatePath("/settings/preferences");
  revalidatePath("/");
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
  if (jitter === "uniform" || jitter === "beta" || jitter === "triangle") {
    next.intra_bucket_jitter = jitter;
  }

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
