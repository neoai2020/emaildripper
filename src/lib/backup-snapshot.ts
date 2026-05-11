import { gzipSync } from "node:zlib";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";

export async function createBackupSnapshotCore(): Promise<{ path: string; bytes: number }> {
  const sb = requireServiceSupabase();

  const [{ data: campaigns }, { count: leadCount }, { data: lastTicks }] = await Promise.all([
    sb.from("campaigns").select("id,name,tag,status,total_leads,sent_count,failed_count,created_at").limit(500),
    sb.from("campaign_leads").select("id", { count: "exact", head: true }),
    sb.from("tick_log").select("at,leads_processed,errors,slow").order("at", { ascending: false }).limit(20),
  ]);

  const payload = {
    v: 2,
    generated_at: new Date().toISOString(),
    campaigns: campaigns ?? [],
    campaign_lead_count: leadCount ?? 0,
    recent_ticks: lastTicks ?? [],
  };

  const json = JSON.stringify(payload);
  const gz = gzipSync(Buffer.from(json, "utf8"));
  const path = `snapshots/${new Date().toISOString().slice(0, 10)}/${Date.now()}.json.gz`;

  const { error: upErr } = await sb.storage.from("app-backups").upload(path, gz, {
    contentType: "application/gzip",
    upsert: false,
  });
  if (upErr) throw new Error(upErr.message);

  await writeAuditLog({
    action: "backup_snapshot_uploaded",
    entityType: "storage",
    entityId: null,
    details: { path, bytes: gz.length, gzip: true },
  });

  return { path, bytes: gz.length };
}
