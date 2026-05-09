import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import type { ArCapRow } from "@/lib/autoresponder-caps";
import { countSendsPerArToday, effectiveDailySendCap, utcDayStartIso } from "@/lib/autoresponder-caps";
import { requireServiceSupabase } from "@/lib/db";
import { safeCompareToken, signMakePayload } from "@/lib/make-webhook";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { maybeSendFailureRateAlert } from "@/lib/tick-alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POST_TIMEOUT_MS = 10_000;

async function postMake(url: string, body: unknown, signal: AbortSignal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  return { status: res.status, text: text.slice(0, 2000) };
}

async function bumpSent(sb: ReturnType<typeof requireServiceSupabase>, campaignId: string) {
  const { data } = await sb.from("campaigns").select("sent_count").eq("id", campaignId).single();
  await sb
    .from("campaigns")
    .update({ sent_count: (data?.sent_count ?? 0) + 1 })
    .eq("id", campaignId);
}

async function bumpFailed(sb: ReturnType<typeof requireServiceSupabase>, campaignId: string) {
  const { data } = await sb.from("campaigns").select("failed_count").eq("id", campaignId).single();
  await sb
    .from("campaigns")
    .update({ failed_count: (data?.failed_count ?? 0) + 1 })
    .eq("id", campaignId);
}

async function markCompletedCampaigns(sb: ReturnType<typeof requireServiceSupabase>) {
  const { data: running, error } = await sb.from("campaigns").select("id").eq("status", "running");
  if (error) return;
  for (const row of running ?? []) {
    const { count, error: cErr } = await sb
      .from("campaign_leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", row.id)
      .in("status", ["pending", "processing"]);
    if (cErr) continue;
    if ((count ?? 0) === 0) {
      await sb
        .from("campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.CRON_TOKEN ?? "";
  if (!expected || !safeCompareToken(token, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  if (!checkRateLimit(`tick:${ip}`, 200, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
  }

  const started = Date.now();
  const sb = requireServiceSupabase();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: settingsAlert } = await sb
    .from("settings")
    .select("telegram_bot_token,telegram_chat_id,failure_rate_alert_pct")
    .eq("id", 1)
    .maybeSingle();

  const arSentToday = await countSendsPerArToday(sb, utcDayStartIso(now));
  const arSuccessThisTick = new Map<string, number>();

  const { data: due, error: dueErr } = await sb
    .from("campaign_leads")
    .select(
      "id,email,scheduled_at,attempt_count,campaign_id,processing_lock,processing_lock_expires_at"
    )
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(80);

  if (dueErr) {
    return NextResponse.json({ ok: false, error: dueErr.message }, { status: 500 });
  }

  const rows = (due ?? []).filter((r) => {
    if (!r.processing_lock) return true;
    if (!r.processing_lock_expires_at) return true;
    return new Date(r.processing_lock_expires_at) <= now;
  });

  if (rows.length === 0) {
    await sb.from("tick_log").insert({ leads_processed: 0, duration_ms: Date.now() - started, errors: 0 });
    await markCompletedCampaigns(sb);
    await maybeSendFailureRateAlert(sb, settingsAlert ?? {}, 0, 0);
    return NextResponse.json({ ok: true, processed: 0, message: "no due leads" });
  }

  const campaignIds = Array.from(new Set(rows.map((r) => r.campaign_id)));
  const { data: camps, error: cErr } = await sb
    .from("campaigns")
    .select("id,status,max_concurrent_per_tick,tag,autoresponder_id,name")
    .in("id", campaignIds)
    .eq("status", "running");
  if (cErr) {
    return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  }
  const campMap = new Map((camps ?? []).map((c) => [c.id, c]));

  const arIds = Array.from(
    new Set((camps ?? []).map((c) => c.autoresponder_id).filter(Boolean) as string[])
  );
  const { data: ars, error: aErr } = await sb.from("autoresponders").select("*").in("id", arIds);
  if (aErr) {
    return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
  }
  const arMap = new Map((ars ?? []).map((a) => [a.id, a]));

  const perCampaign = new Map<string, number>();
  const work: typeof rows = [];
  for (const row of rows) {
    const c = campMap.get(row.campaign_id);
    if (!c) continue;
    const used = perCampaign.get(c.id) ?? 0;
    if (used >= (c.max_concurrent_per_tick ?? 3)) continue;
    perCampaign.set(c.id, used + 1);
    work.push(row);
    if (work.length >= 25) break;
  }

  let processed = 0;
  let errors = 0;

  for (const lead of work) {
    const camp = campMap.get(lead.campaign_id);
    if (!camp) continue;
    const ar = arMap.get(camp.autoresponder_id);
    if (!ar || !ar.is_active) continue;

    const cap = effectiveDailySendCap(ar as ArCapRow, now);
    if (cap != null) {
      const used =
        (arSentToday.get(ar.id as string) ?? 0) + (arSuccessThisTick.get(ar.id as string) ?? 0);
      if (used >= cap) continue;
    }

    const lock = randomUUID();
    const lockExpires = new Date(Date.now() + 60_000).toISOString();

    const { data: claimed, error: claimErr } = await sb
      .from("campaign_leads")
      .update({
        status: "processing",
        processing_lock: lock,
        processing_lock_expires_at: lockExpires,
      })
      .eq("id", lead.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed) continue;

    const attempt = (lead.attempt_count ?? 0) + 1;
    const ts = new Date().toISOString();
    const body = signMakePayload(
      {
        email: lead.email,
        first_name: null,
        last_name: null,
        custom_fields: {},
        campaign_id: camp.id,
        campaign_tag: camp.tag,
        lead_id: lead.id,
        attempt,
        timestamp: ts,
      },
      ar.webhook_secret
    );

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), POST_TIMEOUT_MS);
    let httpStatus = 0;
    let responseText = "";
    const t0 = Date.now();
    try {
      const res = await postMake(ar.make_webhook_url, body, ac.signal);
      httpStatus = res.status;
      responseText = res.text;
    } catch {
      httpStatus = 0;
      responseText = "timeout_or_network_error";
    } finally {
      clearTimeout(timer);
    }
    const durationMs = Date.now() - t0;

    const ok = httpStatus >= 200 && httpStatus < 300;
    await sb.from("campaign_lead_logs").insert({
      campaign_lead_id: lead.id,
      attempt_number: attempt,
      outcome: ok ? "success" : "failure",
      http_status: httpStatus || null,
      response_body: responseText,
      error_message: ok ? null : "non_2xx_or_timeout",
      duration_ms: durationMs,
    });

    if (ok) {
      processed++;
      arSuccessThisTick.set(
        ar.id as string,
        (arSuccessThisTick.get(ar.id as string) ?? 0) + 1
      );
      await sb
        .from("campaign_leads")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          processing_lock: null,
          processing_lock_expires_at: null,
          make_response_status: httpStatus,
          make_response_body: responseText,
          error_message: null,
          attempt_count: attempt,
        })
        .eq("id", lead.id);
      await bumpSent(sb, camp.id);
    } else {
      errors++;
      if (attempt >= 3) {
        await sb
          .from("campaign_leads")
          .update({
            status: "failed",
            processing_lock: null,
            processing_lock_expires_at: null,
            attempt_count: attempt,
            make_response_status: httpStatus || null,
            make_response_body: responseText,
            error_message: "max_retries",
          })
          .eq("id", lead.id);
        await bumpFailed(sb, camp.id);
      } else {
        const backoffMs = attempt === 1 ? 60_000 : attempt === 2 ? 300_000 : 1_800_000;
        const nextAt = new Date(Date.now() + backoffMs).toISOString();
        await sb
          .from("campaign_leads")
          .update({
            status: "pending",
            processing_lock: null,
            processing_lock_expires_at: null,
            attempt_count: attempt,
            scheduled_at: nextAt,
            next_retry_at: nextAt,
            make_response_status: httpStatus || null,
            make_response_body: responseText,
            error_message: "retry_scheduled",
          })
          .eq("id", lead.id);
      }
    }
  }

  await sb.from("tick_log").insert({
    leads_processed: processed,
    duration_ms: Date.now() - started,
    errors,
  });

  await markCompletedCampaigns(sb);

  await maybeSendFailureRateAlert(sb, settingsAlert ?? {}, errors, processed);

  return NextResponse.json({ ok: true, processed, errors, ms: Date.now() - started });
}

export const POST = GET;
