"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteAutoresponderAction } from "@/app/(app)/autoresponders/actions";
import { Button } from "@/components/ui/button";

export function AutoresponderDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive hover:bg-destructive/10"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm(
          `Delete autoresponder "${name}"? This cannot be undone. Campaigns that still use it must be removed or reassigned first.`,
        );
        if (!ok) return;
        start(async () => {
          try {
            await deleteAutoresponderAction(id);
            toast.success("Autoresponder deleted.");
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
