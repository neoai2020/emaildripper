"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { resumeCampaignAction } from "@/app/(app)/campaigns/actions";
import { Button } from "@/components/ui/button";

export function ResumeCampaignPanel({
  campaignId,
  pendingCount,
  shiftMs,
}: {
  campaignId: string;
  pendingCount: number;
  shiftMs: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  const shiftH = Math.round((shiftMs / 3600_000) * 10) / 10;

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => dialogRef.current?.showModal()}>
        Resume
      </Button>
      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 w-[min(100%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 text-sm shadow-xl backdrop:bg-black/50"
      >
        <h3 className="font-heading text-base font-semibold text-foreground">Resume campaign</h3>
        <p className="mt-3 text-muted-foreground">
          {pendingCount} pending lead(s) will shift forward by approximately{" "}
          <span className="font-mono text-foreground">{shiftH}h</span> ({Math.round(shiftMs / 60000)} minutes) to
          account for the pause. If a shifted send would fall after your previous campaign end time, the end time moves
          forward automatically.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await resumeCampaignAction(campaignId);
                  toast.success("Campaign resumed");
                  dialogRef.current?.close();
                  window.location.reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Resume failed");
                }
              });
            }}
          >
            {pending ? "Working…" : "Confirm resume"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
