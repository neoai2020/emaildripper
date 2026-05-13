"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteCampaignAction } from "@/app/(app)/campaigns/actions";
import { Button } from "@/components/ui/button";

export function CampaignDeleteButton({
  id,
  name,
  deletable,
}: {
  id: string;
  name: string;
  deletable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive hover:bg-destructive/10"
      disabled={!deletable || pending}
      title={
        deletable
          ? undefined
          : "Cancel or finish this campaign before it can be deleted."
      }
      onClick={() => {
        if (!deletable) return;
        const ok = window.confirm(
          `Delete campaign "${name}"? This removes the campaign and all of its lead rows. You cannot undo this.`,
        );
        if (!ok) return;
        start(async () => {
          try {
            await deleteCampaignAction(id);
            toast.success("Campaign deleted.");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed.");
          }
        });
      }}
    >
      Delete
    </Button>
  );
}
