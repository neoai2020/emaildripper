"use server";

import { gunzipSync } from "node:zlib";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import { createBackupSnapshotCore } from "@/lib/backup-snapshot";
import { requireServiceSupabase } from "@/lib/db";

function assertBackupPath(path: string) {
  if (!path.startsWith("snapshots/") || path.includes("..")) {
    throw new Error("Invalid backup path.");
  }
}

export async function createBackupSnapshotAdminAction(): Promise<{ path: string; bytes: number }> {
  const r = await createBackupSnapshotCore();
  revalidatePath("/settings/backups");
  return r;
}

export async function createBackupSnapshotFormAction() {
  await createBackupSnapshotAdminAction();
}

export async function getBackupSignedDownloadUrlAction(path: string): Promise<{ url: string }> {
  assertBackupPath(path);
  const sb = requireServiceSupabase();
  const { data, error } = await sb.storage.from("app-backups").createSignedUrl(path, 120);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not create download link.");
  await writeAuditLog({
    action: "backup_signed_url_created",
    entityType: "storage",
    entityId: null,
    details: { path },
  });
  return { url: data.signedUrl };
}

export async function deleteBackupObjectAction(path: string, confirm: string): Promise<void> {
  if (confirm !== "DELETE") {
    throw new Error('Type exactly "DELETE" to remove this snapshot file.');
  }
  assertBackupPath(path);
  const sb = requireServiceSupabase();
  const { error } = await sb.storage.from("app-backups").remove([path]);
  if (error) throw new Error(error.message);
  await writeAuditLog({
    action: "backup_object_deleted",
    entityType: "storage",
    entityId: null,
    details: { path },
  });
  revalidatePath("/settings/backups");
}

/** Verifies gzip JSON digest; v2 snapshots are summaries only (no automatic table restore). */
export async function verifyBackupSnapshotAction(path: string, confirm: string): Promise<{ ok: true; note: string }> {
  if (confirm !== "RESTORE") {
    throw new Error('Type exactly "RESTORE" to verify this snapshot file.');
  }
  assertBackupPath(path);
  const sb = requireServiceSupabase();
  const { data: bin, error: dlErr } = await sb.storage.from("app-backups").download(path);
  if (dlErr || !bin) throw new Error(dlErr?.message ?? "Download failed.");
  const buf = Buffer.from(await bin.arrayBuffer());
  let json: unknown;
  try {
    const un = gunzipSync(buf);
    json = JSON.parse(un.toString("utf8"));
  } catch {
    throw new Error("File is not a valid gzip JSON snapshot.");
  }
  const v = (json as { v?: number }).v;
  if (v !== 2) throw new Error("Unsupported snapshot version.");
  await writeAuditLog({
    action: "backup_snapshot_verified",
    entityType: "storage",
    entityId: null,
    details: { path, v },
  });
  revalidatePath("/settings/backups");
  return {
    ok: true,
    note:
      "Snapshot verified. These v2 files are digests for archive only — use Supabase Pro backups for full database restore.",
  };
}
