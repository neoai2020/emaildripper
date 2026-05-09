"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";
import { isValidEmailSyntax, normalizeEmail } from "@/lib/validation/email";

export async function bulkUpsertMasterLeadsAction(raw: {
  emails: string[];
  sourceLabel: string | null;
}): Promise<{ upserted: number }> {
  const emails = Array.from(
    new Set(raw.emails.map((e) => normalizeEmail(e)).filter((e) => isValidEmailSyntax(e)))
  );
  if (emails.length === 0) throw new Error("No valid emails.");

  const sb = requireServiceSupabase();
  const rows = emails.map((email) => ({
    email,
    source_label: raw.sourceLabel?.trim() || null,
  }));

  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await sb.from("master_leads").upsert(slice, { onConflict: "email" });
    if (error) throw new Error(error.message);
  }

  await writeAuditLog({
    action: "master_leads_bulk_upsert",
    entityType: "master_leads",
    entityId: null,
    details: { count: emails.length },
  });

  revalidatePath("/leads/master");
  return { upserted: emails.length };
}
