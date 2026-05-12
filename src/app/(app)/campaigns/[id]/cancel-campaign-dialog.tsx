"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelCampaignAction } from "@/app/(app)/campaigns/actions";
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

export function CancelCampaignDialog({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("confirm", val.trim());
        await cancelCampaignAction(campaignId, fd);
        toast.success("Campaign cancelled. Pending sends were cleared.");
        setOpen(false);
        setVal("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not cancel campaign.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Cancel campaign
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-md sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Cancel this campaign?</SheetTitle>
            <SheetDescription>
              Pending leads will be marked skipped. Type <span className="font-mono font-semibold">CANCEL</span> to
              confirm.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4">
            <Label htmlFor="cancel-confirm">Confirmation</Label>
            <Input
              id="cancel-confirm"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="CANCEL"
              autoComplete="off"
            />
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="button" variant="destructive" disabled={pending || val.trim() !== "CANCEL"} onClick={submit}>
              {pending ? "Cancelling…" : "Confirm cancel"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
