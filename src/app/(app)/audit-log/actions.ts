"use server";

import { requireServiceSupabase } from "@/lib/db";

function escapeCsvCell(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function exportAuditCsvAction(): Promise<string> {
  const sb = requireServiceSupabase();
  const { data: rows, error } = await sb
    .from("audit_log")
    .select("at,action,entity_type,entity_id,details")
    .order("at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);

  const header = ["at", "action", "entity_type", "entity_id", "details"];
  const lines = [header.join(",")];
  for (const r of rows ?? []) {
    lines.push(
      [
        escapeCsvCell(r.at ? new Date(r.at as string).toISOString() : ""),
        escapeCsvCell(String(r.action ?? "")),
        escapeCsvCell(String(r.entity_type ?? "")),
        escapeCsvCell(r.entity_id ? String(r.entity_id) : ""),
        escapeCsvCell(r.details ? JSON.stringify(r.details) : "{}"),
      ].join(",")
    );
  }
  return lines.join("\n");
}
