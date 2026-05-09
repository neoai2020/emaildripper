"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  clearAuditLogAction,
  clearTickLogAction,
  deleteAllCampaignsAction,
  deletePreviewCampaignsAction,
  resetSettingsAction,
} from "@/app/(app)/settings/danger/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function DangerBlock({
  title,
  body,
  phrase,
  action,
  variant = "outline" as const,
}: {
  title: string;
  body: string;
  phrase: string;
  action: (fd: FormData) => Promise<void>;
  variant?: "outline" | "destructive";
}) {
  const [val, setVal] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("confirm", val);
    start(async () => {
      try {
        await action(fd);
        toast.success("Done.");
        setVal("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border/80 p-4">
      <h3 className="font-heading text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label>Type: {phrase}</Label>
          <Input value={val} onChange={(e) => setVal(e.target.value)} className="font-mono text-xs" />
        </div>
        <Button type="submit" variant={variant} disabled={pending}>
          {pending ? "…" : "Run"}
        </Button>
      </form>
    </div>
  );
}

export function DangerZoneClient() {
  return (
    <div className="mt-8 space-y-6">
      <DangerBlock
        title="Delete preview campaigns"
        body="Removes rows in status previewing only (and their campaign_leads via cascade)."
        phrase="DELETE PREVIEWS"
        action={deletePreviewCampaignsAction}
      />
      <DangerBlock
        title="Delete all campaigns"
        body="Deletes every campaign and all campaign_leads / logs. Autoresponders and master leads are kept."
        phrase="DELETE ALL CAMPAIGNS"
        action={deleteAllCampaignsAction}
        variant="destructive"
      />
      <DangerBlock
        title="Clear audit log"
        body="Deletes all audit_log rows (including this session’s trail after the delete completes)."
        phrase="CLEAR AUDIT LOG"
        action={clearAuditLogAction}
        variant="destructive"
      />
      <DangerBlock
        title="Clear tick log"
        body="Removes worker tick_log history (useful after noisy testing)."
        phrase="CLEAR TICK LOG"
        action={clearTickLogAction}
      />
      <DangerBlock
        title="Reset global settings"
        body="Resets row id=1 to defaults (tooltips on, Vienna TZ, clears Telegram/email, default randomization JSON)."
        phrase="RESET SETTINGS"
        action={resetSettingsAction}
        variant="destructive"
      />
    </div>
  );
}
