import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeEmail } from "@/lib/validation/email";

export const MASTER_LEAD_UPSERT_CHUNK = 500;
export const SUPPRESSION_IN_CHUNK = 400;

export async function loadSuppressedSet(sb: SupabaseClient, emails: string[]): Promise<Set<string>> {
  const suppressedSet = new Set<string>();
  for (let i = 0; i < emails.length; i += SUPPRESSION_IN_CHUNK) {
    const slice = emails.slice(i, i + SUPPRESSION_IN_CHUNK);
    const { data, error } = await sb.from("suppression_list").select("email").in("email", slice);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) suppressedSet.add(row.email as string);
  }
  return suppressedSet;
}

export async function chunkedMasterLeadUpsert(
  sb: SupabaseClient,
  emails: string[],
  sourceLabel?: string | null
): Promise<void> {
  const unique = Array.from(new Set(emails.map(normalizeEmail)));
  const label = sourceLabel?.trim() || null;
  const rows = unique.map((email) => ({
    email,
    source_label: label,
  }));

  for (let i = 0; i < rows.length; i += MASTER_LEAD_UPSERT_CHUNK) {
    const slice = rows.slice(i, i + MASTER_LEAD_UPSERT_CHUNK);
    const { error } = await sb.from("master_leads").upsert(slice, { onConflict: "email" });
    if (error) throw new Error(error.message);
  }
}

export async function ensureMasterLeadIds(
  sb: SupabaseClient,
  emails: string[],
  sourceLabel?: string | null
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(emails.map(normalizeEmail)));

  await chunkedMasterLeadUpsert(sb, unique, sourceLabel);

  for (let i = 0; i < unique.length; i += MASTER_LEAD_UPSERT_CHUNK) {
    const slice = unique.slice(i, i + MASTER_LEAD_UPSERT_CHUNK);
    const { data, error } = await sb.from("master_leads").select("id,email").in("email", slice);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      map.set(row.email as string, row.id as string);
    }
  }
  return map;
}
