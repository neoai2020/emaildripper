import { getServiceSupabase } from "@/lib/db";

export type SettingsRow = {
  id: number;
  tooltips_enabled: boolean;
  theme: string;
  default_tz: string;
  randomization_settings: Record<string, unknown> | null;
  backup_retention_days: number;
};

export async function getSettings(): Promise<SettingsRow | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  return data as SettingsRow;
}
