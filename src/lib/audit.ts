import { getServiceSupabase } from "@/lib/db";

export async function writeAuditLog(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const sb = getServiceSupabase();
  if (!sb) return;
  await sb.from("audit_log").insert({
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    details: input.details ?? {},
  });
}
