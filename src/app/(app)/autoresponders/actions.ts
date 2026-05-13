"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAuditLog } from "@/lib/audit";
import { requireServiceSupabase } from "@/lib/db";
import { autoresponderBaseSchema } from "@/lib/schemas/autoresponder";

const idSchema = z.string().uuid();

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
  redirect(`/autoresponders?created=1`);
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

export async function deleteAutoresponderAction(id: string) {
  const sb = requireServiceSupabase();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new Error("Invalid autoresponder id.");

  const { count, error: countErr } = await sb
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("autoresponder_id", parsed.data);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      "This autoresponder is still linked to one or more campaigns. Remove those campaigns or point them at another autoresponder, then try again.",
    );
  }

  const { data: row, error: fetchErr } = await sb
    .from("autoresponders")
    .select("name")
    .eq("id", parsed.data)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Autoresponder not found.");

  const { error } = await sb.from("autoresponders").delete().eq("id", parsed.data);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "autoresponder_deleted",
    entityType: "autoresponder",
    entityId: parsed.data,
    details: { name: row.name },
  });

  revalidatePath("/autoresponders");
  revalidatePath(`/autoresponders/${parsed.data}`);
}
