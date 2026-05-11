"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";

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

export type SuppressionCsvResult = {
  added: number;
  already: number;
  invalid: number;
  invalid_sample: string[];
};

export async function uploadSuppressionCsvAction(formData: FormData): Promise<SuppressionCsvResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a non-empty CSV file.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("CSV file is too large (max 20 MB).");
  }

  const text = await file.text();
  const res = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (res.errors.length) {
    throw new Error(res.errors[0]?.message ?? "CSV parse error");
  }
  const fields = res.meta.fields ?? [];
  const emailKey = fields.find((k) => /email|e-mail/i.test(String(k))) ?? fields[0] ?? "email";

  const emails: string[] = [];
  let invalid = 0;
  const invalid_sample: string[] = [];
  for (const row of res.data ?? []) {
    const cell = row[emailKey]?.trim() ?? "";
    if (!cell) continue;
    const e = normalizeEmail(cell.split(",")[0] ?? cell);
    if (!isValidEmailSyntax(e)) {
      invalid += 1;
      if (invalid_sample.length < 8) invalid_sample.push(cell.slice(0, 80));
      continue;
    }
    emails.push(e);
  }

  const unique = Array.from(new Set(emails));
  if (unique.length === 0) {
    throw new Error("No valid email addresses found in this CSV.");
  }

  const sb = requireServiceSupabase();
  const { data: existing } = await sb.from("suppression_list").select("email").in("email", unique);
  const existingSet = new Set((existing ?? []).map((r) => r.email as string));
  const toInsert = unique.filter((e) => !existingSet.has(e));
  const already = unique.length - toInsert.length;

  let added = 0;
  const chunk = 200;
  for (let i = 0; i < toInsert.length; i += chunk) {
    const slice = toInsert.slice(i, i + chunk).map((email) => ({
      email,
      reason: "manual" as const,
      source: "manual_upload" as const,
      notes: "csv_upload",
    }));
    const { error } = await sb.from("suppression_list").insert(slice);
    if (error) throw new Error(error.message);
    added += slice.length;
  }

  await writeAuditLog({
    action: "suppression_csv_uploaded",
    entityType: "suppression_list",
    entityId: null,
    details: { added, already, invalid },
  });

  revalidatePath("/leads/suppression");
  return {
    added,
    already,
    invalid,
    invalid_sample,
  };
}
