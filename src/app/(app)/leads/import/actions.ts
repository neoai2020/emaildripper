"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";
import { chunkedMasterLeadUpsert } from "@/lib/leads/bulkUpsert";
import { isValidEmailSyntax, normalizeEmail } from "@/lib/validation/email";

export async function bulkUpsertMasterLeadsAction(raw: {
  emails: string[];
  sourceLabel: string | null;
}): Promise<{ upserted: number; droppedInvalid: number }> {
  const uniqueNormalized = Array.from(new Set(raw.emails.map((e) => normalizeEmail(e))));
  const emails = uniqueNormalized.filter((e) => isValidEmailSyntax(e));
  const droppedInvalid = uniqueNormalized.length - emails.length;
  if (emails.length === 0) throw new Error("No valid emails.");

  const sb = requireServiceSupabase();
  await chunkedMasterLeadUpsert(sb, emails, raw.sourceLabel);

  await writeAuditLog({
    action: "master_leads_bulk_upsert",
    entityType: "master_leads",
    entityId: null,
    details: { count: emails.length },
  });

  revalidatePath("/leads/master");
  return { upserted: emails.length, droppedInvalid };
}
