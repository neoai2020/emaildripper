"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteBackupObjectAction,
  getBackupSignedDownloadUrlAction,
  verifyBackupSnapshotAction,
} from "@/app/(app)/settings/backups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function BackupFileActions({ path }: { path: string }) {
  const [delOpen, setDelOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [delVal, setDelVal] = useState("");
  const [resVal, setResVal] = useState("");
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      try {
        const { url } = await getBackupSignedDownloadUrlAction(path);
        window.open(url, "_blank", "noopener,noreferrer");
        toast.success("Opening signed download…");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Download failed.");
      }
    });
  }

  function deleteFile() {
    start(async () => {
      try {
        await deleteBackupObjectAction(path, delVal.trim());
        toast.success("Backup file deleted.");
        setDelOpen(false);
        setDelVal("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed.");
      }
    });
  }

  function verify() {
    start(async () => {
      try {
        const r = await verifyBackupSnapshotAction(path, resVal.trim());
        toast.success(r.note);
        setResOpen(false);
        setResVal("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Verify failed.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={download}>
        Download
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setResOpen(true)}>
        Verify
      </Button>
      <Button type="button" variant="destructive" size="sm" onClick={() => setDelOpen(true)}>
        Delete
      </Button>

      <Sheet open={delOpen} onOpenChange={setDelOpen}>
        <SheetContent side="right" className="max-w-md">
          <SheetHeader>
            <SheetTitle>Delete backup file?</SheetTitle>
            <SheetDescription>Type DELETE to remove this object from storage.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4">
            <Label htmlFor="del-conf">Confirmation</Label>
            <Input id="del-conf" value={delVal} onChange={(e) => setDelVal(e.target.value)} placeholder="DELETE" />
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setDelOpen(false)}>
              Close
            </Button>
            <Button variant="destructive" disabled={pending || delVal.trim() !== "DELETE"} onClick={deleteFile}>
              {pending ? "Deleting…" : "Delete file"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={resOpen} onOpenChange={setResOpen}>
        <SheetContent side="right" className="max-w-md">
          <SheetHeader>
            <SheetTitle>Verify snapshot</SheetTitle>
            <SheetDescription>
              Type RESTORE to download and verify this gzip digest. No tables are modified — full restore uses
              Supabase backups.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4">
            <Label htmlFor="res-conf">Confirmation</Label>
            <Input id="res-conf" value={resVal} onChange={(e) => setResVal(e.target.value)} placeholder="RESTORE" />
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setResOpen(false)}>
              Close
            </Button>
            <Button disabled={pending || resVal.trim() !== "RESTORE"} onClick={verify}>
              {pending ? "Verifying…" : "Verify file"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
