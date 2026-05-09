"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";
import { autoresponderBaseSchema } from "@/lib/schemas/autoresponder";

function parseAutoresponderForm(formData: FormData) {
  return autoresponderBaseSchema.parse({
    name: formData.get("name"),
    provider: formData.get("provider"),
    account_email: formData.get("account_email"),
    make_webhook_url: formData.get("make_webhook_url"),
    webhook_secret: formData.get("webhook_secret"),
    daily_cap: formData.get("daily_cap") || null,
    warmup_enabled: formData.get("warmup_enabled") != null,
    warmup_started_at: formData.get("warmup_started_at") || null,
    is_active: formData.get("is_active") != null,
    notes: formData.get("notes") || null,
  });
}

export async function createAutoresponderAction(formData: FormData) {
  const sb = requireServiceSupabase();
  const data = parseAutoresponderForm(formData);

  const row = {
    name: data.name,
    provider: data.provider,
    account_email: data.account_email,
    make_webhook_url: data.make_webhook_url,
    webhook_secret: data.webhook_secret,
    daily_cap: data.daily_cap ?? null,
    warmup_enabled: data.warmup_enabled,
    warmup_started_at: data.warmup_started_at
      ? new Date(data.warmup_started_at).toISOString()
      : null,
    is_active: data.is_active,
    notes: data.notes ?? null,
  };

  const { data: inserted, error } = await sb
    .from("autoresponders")
    .insert(row)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "autoresponder_created",
    entityType: "autoresponder",
    entityId: inserted.id,
    details: { name: data.name },
  });

  revalidatePath("/autoresponders");
  redirect(`/autoresponders/${inserted.id}?created=1`);
}

export async function updateAutoresponderAction(id: string, formData: FormData) {
  const sb = requireServiceSupabase();
  const data = parseAutoresponderForm(formData);

  const row = {
    name: data.name,
    provider: data.provider,
    account_email: data.account_email,
    make_webhook_url: data.make_webhook_url,
    webhook_secret: data.webhook_secret,
    daily_cap: data.daily_cap ?? null,
    warmup_enabled: data.warmup_enabled,
    warmup_started_at: data.warmup_started_at
      ? new Date(data.warmup_started_at).toISOString()
      : null,
    is_active: data.is_active,
    notes: data.notes ?? null,
  };

  const { error } = await sb.from("autoresponders").update(row).eq("id", id);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "autoresponder_updated",
    entityType: "autoresponder",
    entityId: id,
    details: { name: data.name },
  });

  revalidatePath("/autoresponders");
  revalidatePath(`/autoresponders/${id}`);
  redirect(`/autoresponders/${id}?saved=1`);
}
