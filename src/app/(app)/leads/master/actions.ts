"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";

const idSchema = z.string().uuid();

export async function deleteMasterLeadAction(id: string) {
  const sb = requireServiceSupabase();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new Error("Invalid lead id.");

  const { data: row, error: fetchErr } = await sb
    .from("master_leads")
    .select("id,email")
    .eq("id", parsed.data)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Lead not found.");

  const { error } = await sb.from("master_leads").delete().eq("id", parsed.data);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "master_lead_deleted",
    entityType: "master_lead",
    entityId: parsed.data,
    details: { email: row.email },
  });

  revalidatePath("/leads/master");
  revalidatePath("/");
}
