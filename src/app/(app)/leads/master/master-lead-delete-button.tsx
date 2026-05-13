"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteMasterLeadAction } from "@/app/(app)/leads/master/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MasterLeadDeleteButton({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-destructive hover:bg-destructive/10")}
      onClick={() => {
        const ok = window.confirm(
          `Remove "${email}" from the master list? Campaign rows that pointed at this lead will keep their email text but lose the master link. This cannot be undone.`,
        );
        if (!ok) return;
        start(async () => {
          try {
            await deleteMasterLeadAction(id);
            toast.success("Master lead removed.");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed.");
          }
        });
      }}
    >
      Delete
    </button>
  );
}
