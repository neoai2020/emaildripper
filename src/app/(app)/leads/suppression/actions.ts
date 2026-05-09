"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";
import { normalizeEmail, isValidEmailSyntax } from "@/lib/validation/email";

export async function addSuppressionAction(formData: FormData) {
  const raw = String(formData.get("email") ?? "");
  const email = normalizeEmail(raw);
  if (!isValidEmailSyntax(email)) {
    throw new Error("Invalid email");
  }

  const sb = requireServiceSupabase();
  const { error } = await sb.from("suppression_list").insert({
    email,
    reason: "manual",
    source: "manual_upload",
    notes: String(formData.get("notes") ?? "") || null,
  });
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "suppression_added",
    entityType: "suppression_list",
    entityId: null,
    details: { email },
  });

  revalidatePath("/leads/suppression");
}
