"use server";

import { writeAuditLog } from "@/lib/audit";

export async function recordHelpFeedbackAction(section: string, helpful: boolean) {
  const safe = section.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  await writeAuditLog({
    action: helpful ? "help_feedback_positive" : "help_feedback_negative",
    entityType: "help",
    entityId: null,
    details: { section: safe || "unknown" },
  });
}
