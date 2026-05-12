import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import type { ArCapRow } from "@/lib/autoresponder-caps";
import { countSendsPerArToday, effectiveDailySendCap, utcDayStartIso } from "@/lib/autoresponder-caps";
import { requireServiceSupabase } from "@/lib/db";
import { MAKE_WEBHOOK_POST_MS, postSignedMakeLead, safeCompareToken, signMakePayload } from "@/lib/make-webhook";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

/** PRD worker batch sizing — align outbound work per tick */
const DUE_SELECT_LIMIT = 100;
const MAX_WORK_LEADS = 10;
const TICK_SLOW_MS = 25_000;

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

async function markCompletedCampaigns(
  sb: ReturnType<typeof requireServiceSupabase>
): Promise<string[]> {
  const completed: string[] = [];
  const { data: running, error } = await sb.from("campaigns").select("id").eq("status", "running");
  if (error) return completed;
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
      completed.push(row.id as string);
    }
  }
  return completed;
}

export async function runTick(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.CRON_TOKEN ?? "";
  if (!expected || !safeCompareToken(token, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`tick:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limit" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const started = Date.now();
  const sb = requireServiceSupabase();
  const now = new Date();
  const nowIso = now.toISOString();

  const todayUtc = nowIso.slice(0, 10);
  const { data: purgeRow } = await sb.from("settings").select("last_cancel_purge_utc").eq("id", 1).maybeSingle();
  if (purgeRow?.last_cancel_purge_utc !== todayUtc) {
    const { data: victims, error: pvErr } = await sb
      .from("campaigns")
      .select("id")
      .eq("status", "cancelled")
      .not("purge_at", "is", null)
      .lte("purge_at", nowIso);
    if (!pvErr) {
      for (const v of victims ?? []) {
        // eslint-disable-next-line no-await-in-loop
        await sb.from("campaigns").delete().eq("id", v.id as string);
      }
    }
    await sb.from("settings").update({ last_cancel_purge_utc: todayUtc }).eq("id", 1);
  }

  const { data: tickRow, error: tickInsErr } = await sb
    .from("tick_log")
    .insert({ leads_processed: 0, duration_ms: 0, errors: 0 })
    .select("id")
    .single();
  if (tickInsErr || !tickRow?.id) {
    return NextResponse.json({ ok: false, error: tickInsErr?.message ?? "tick_log" }, { status: 500 });
  }
  const tickLogId = tickRow.id as number;

  const arSentToday = await countSendsPerArToday(sb, utcDayStartIso(now));
  const arSuccessThisTick = new Map<string, number>();

  const { data: due, error: dueErr } = await sb
    .from("campaign_leads")
    .select(
      "id,email,scheduled_at,attempt_count,campaign_id,processing_lock,processing_lock_expires_at,master_lead_id"
    )
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(DUE_SELECT_LIMIT);

  if (dueErr) {
    const duration_ms = Date.now() - started;
    await sb
      .from("tick_log")
      .update({
        leads_processed: 0,
        duration_ms,
        errors: 1,
        slow: duration_ms > TICK_SLOW_MS,
      })
      .eq("id", tickLogId);
    return NextResponse.json({ ok: false, error: dueErr.message }, { status: 500 });
  }

  const rows = (due ?? []).filter((r) => {
    if (!r.processing_lock) return true;
    if (!r.processing_lock_expires_at) return true;
    return new Date(r.processing_lock_expires_at) <= now;
  });

  if (rows.length === 0) {
    const duration_ms = Date.now() - started;
    await sb
      .from("tick_log")
      .update({
        leads_processed: 0,
        duration_ms,
        errors: 0,
        slow: duration_ms > TICK_SLOW_MS,
      })
      .eq("id", tickLogId);
    await markCompletedCampaigns(sb);
    await sb.from("settings").update({ last_successful_tick_at: nowIso }).eq("id", 1);
    return NextResponse.json({ ok: true, processed: 0, message: "no due leads" });
  }

  const campaignIds = Array.from(new Set(rows.map((r) => r.campaign_id)));
  const { data: camps, error: cErr } = await sb
    .from("campaigns")
    .select("id,status,max_concurrent_per_tick,tag,autoresponder_id,name,dry_run")
    .in("id", campaignIds)
    .eq("status", "running");
  if (cErr) {
    const duration_ms = Date.now() - started;
    await sb
      .from("tick_log")
      .update({
        leads_processed: 0,
        duration_ms,
        errors: 1,
        slow: duration_ms > TICK_SLOW_MS,
      })
      .eq("id", tickLogId);
    return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  }
  const campMap = new Map((camps ?? []).map((c) => [c.id, c]));

  const arIds = Array.from(
    new Set((camps ?? []).map((c) => c.autoresponder_id).filter(Boolean) as string[])
  );
  const { data: ars, error: aErr } = await sb.from("autoresponders").select("*").in("id", arIds);
  if (aErr) {
    const duration_ms = Date.now() - started;
    await sb
      .from("tick_log")
      .update({
        leads_processed: 0,
        duration_ms,
        errors: 1,
        slow: duration_ms > TICK_SLOW_MS,
      })
      .eq("id", tickLogId);
    return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
  }
  const arMap = new Map((ars ?? []).map((a) => [a.id, a]));

  const masterIds = Array.from(
    new Set(
      rows
        .map((r) => r.master_lead_id as string | null | undefined)
        .filter((x): x is string => Boolean(x))
    )
  );
  const masterMap = new Map<
    string,
    { first_name: string | null; last_name: string | null; custom_fields: Record<string, unknown> }
  >();
  if (masterIds.length > 0) {
    const { data: masters } = await sb
      .from("master_leads")
      .select("id,first_name,last_name,custom_fields")
      .in("id", masterIds);
    for (const m of masters ?? []) {
      masterMap.set(m.id as string, {
        first_name: (m.first_name as string | null) ?? null,
        last_name: (m.last_name as string | null) ?? null,
        custom_fields: (m.custom_fields as Record<string, unknown>) ?? {},
      });
    }
  }

  const perCampaign = new Map<string, number>();
  const work: typeof rows = [];
  for (const row of rows) {
    const c = campMap.get(row.campaign_id);
    if (!c) continue;
    const used = perCampaign.get(c.id) ?? 0;
    if (used >= (c.max_concurrent_per_tick ?? 3)) continue;
    perCampaign.set(c.id, used + 1);
    work.push(row);
    if (work.length >= MAX_WORK_LEADS) break;
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
    const master = lead.master_lead_id ? masterMap.get(lead.master_lead_id as string) : undefined;

    const dryRun = Boolean((camp as { dry_run?: boolean }).dry_run);

    const t0 = Date.now();
    try {
      const webhookUrl = typeof ar.make_webhook_url === "string" ? ar.make_webhook_url.trim() : "";
      const webhookSecret = typeof ar.webhook_secret === "string" ? ar.webhook_secret : "";
      if (!dryRun && (!webhookUrl || webhookSecret.length === 0)) {
        const durationMs = Date.now() - t0;
        await sb.from("campaign_lead_logs").insert({
          campaign_lead_id: lead.id,
          attempt_number: attempt,
          outcome: "failure",
          http_status: null,
          response_body: "missing_webhook_url_or_secret",
          error_message: "non_2xx_or_timeout",
          duration_ms: durationMs,
        });
        errors++;
        if (attempt >= 3) {
          await sb
            .from("campaign_leads")
            .update({
              status: "failed",
              processing_lock: null,
              processing_lock_expires_at: null,
              attempt_count: attempt,
              make_response_status: null,
              make_response_body: "missing_webhook_url_or_secret",
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
              make_response_status: null,
              make_response_body: "missing_webhook_url_or_secret",
              error_message: "retry_scheduled",
            })
            .eq("id", lead.id);
        }
        continue;
      }

      const body = signMakePayload(
        {
          email: lead.email,
          first_name: master?.first_name ?? null,
          last_name: master?.last_name ?? null,
          custom_fields: master?.custom_fields ?? {},
          campaign_id: camp.id,
          campaign_tag: camp.tag,
          lead_id: lead.id,
          attempt,
          timestamp: ts,
        },
        webhookSecret
      );

      let httpStatus = 0;
      let responseText = "";

      if (dryRun) {
        httpStatus = 204;
        responseText = "dry_run_no_http";
      } else {
        const res = await postSignedMakeLead(webhookUrl, body, MAKE_WEBHOOK_POST_MS);
        httpStatus = res.status;
        responseText = res.text;
      }

      const durationMs = Date.now() - t0;
      const ok = dryRun || (httpStatus >= 200 && httpStatus < 300);

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
        if (!dryRun) {
          arSuccessThisTick.set(
            ar.id as string,
            (arSuccessThisTick.get(ar.id as string) ?? 0) + 1
          );
        }
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
    } catch (e) {
      console.error("[tick] lead processing error", lead.id, e);
      errors++;
      const durationMs = Date.now() - t0;
      const msg = e instanceof Error ? e.message : "tick_exception";
      await sb.from("campaign_lead_logs").insert({
        campaign_lead_id: lead.id,
        attempt_number: attempt,
        outcome: "failure",
        http_status: null,
        response_body: msg.slice(0, 500),
        error_message: "worker_exception",
        duration_ms: durationMs,
      });
      if (attempt >= 3) {
        await sb
          .from("campaign_leads")
          .update({
            status: "failed",
            processing_lock: null,
            processing_lock_expires_at: null,
            attempt_count: attempt,
            make_response_status: null,
            make_response_body: msg.slice(0, 500),
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
            make_response_status: null,
            make_response_body: msg.slice(0, 500),
            error_message: "retry_scheduled",
          })
          .eq("id", lead.id);
      }
    }
  }

  const duration_ms = Date.now() - started;
  await sb
    .from("tick_log")
    .update({
      leads_processed: processed,
      duration_ms,
      errors,
      slow: duration_ms > TICK_SLOW_MS,
    })
    .eq("id", tickLogId);

  await markCompletedCampaigns(sb);
  await sb.from("settings").update({ last_successful_tick_at: new Date().toISOString() }).eq("id", 1);

  return NextResponse.json({ ok: true, processed, errors, ms: duration_ms });
}
