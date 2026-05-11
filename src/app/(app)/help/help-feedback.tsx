"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { recordHelpFeedbackAction } from "@/app/(app)/help/actions";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/help-tip";

export function HelpFeedback({ section }: { section: string }) {
  const [pending, start] = useTransition();
  function send(helpful: boolean) {
    start(async () => {
      try {
        await recordHelpFeedbackAction(section, helpful);
        toast.success("Thanks — noted in the audit log.");
      } catch {
        toast.error("Could not save feedback.");
      }
    });
  }
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border/80 pt-6 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        Was this helpful?
        <HelpTip id="help.feedback" />
      </span>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => send(true)}>
        👍 Yes
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => send(false)}>
        👎 No
      </Button>
    </div>
  );
}
