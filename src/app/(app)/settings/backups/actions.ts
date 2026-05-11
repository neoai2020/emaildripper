"use server";

import { revalidatePath } from "next/cache";

import { createBackupSnapshotCore } from "@/lib/backup-snapshot";

export async function createBackupSnapshotAdminAction(): Promise<{ path: string; bytes: number }> {
  const r = await createBackupSnapshotCore();
  revalidatePath("/settings/backups");
  return r;
}

export async function createBackupSnapshotFormAction() {
  await createBackupSnapshotAdminAction();
}
