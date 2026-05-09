import type { SupabaseClient } from "@supabase/supabase-js";

import { writeAuditLog } from "@/lib/audit";
import { sendTelegramMessage } from "@/lib/telegram";

type SettingsAlert = {
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
  failure_rate_alert_pct?: number | null;
};

/** After a tick, optionally notify Telegram if recent webhook failure rate is high. */
export async function maybeSendFailureRateAlert(
  sb: SupabaseClient,
  settings: SettingsAlert | null | undefined,
  tickErrors: number,
  tickProcessed: number
): Promise<void> {
  if (!settings) return;
  const token = settings.telegram_bot_token?.trim();
  const chat = settings.telegram_chat_id?.trim();
  const pct = Number(settings.failure_rate_alert_pct ?? 10);
  if (!token || !chat) return;

  const since = new Date(Date.now() - 2 * 3600_000).toISOString();
  const { data: recent } = await sb
    .from("campaign_lead_logs")
    .select("outcome,attempted_at")
    .gte("attempted_at", since)
    .order("attempted_at", { ascending: false })
    .limit(400);
  const rows = recent ?? [];
  if (rows.length < 20) return;

  let fail = 0;
  for (const r of rows) {
    if (r.outcome === "failure") fail++;
  }
  const rate = (fail / rows.length) * 100;
  if (rate < pct) return;

  const { data: dup } = await sb
    .from("audit_log")
    .select("id")
    .eq("action", "failure_rate_alert_sent")
    .gte("at", new Date(Date.now() - 3600_000).toISOString())
    .limit(1)
    .maybeSingle();
  if (dup) return;

  const text = [
    `Drip Importer: high webhook failure rate (~${rate.toFixed(1)}% over last ${rows.length} attempts in 2h).`,
    `This tick: processed=${tickProcessed}, errors=${tickErrors}.`,
    `Threshold=${pct}%.`,
  ].join("\n");

  const r = await sendTelegramMessage(token, chat, text.slice(0, 3500));
  await writeAuditLog({
    action: "failure_rate_alert_sent",
    entityType: "system",
    entityId: null,
    details: { ok: r.ok, rate, sample: rows.length, telegram: r.description ?? null },
  });
}
