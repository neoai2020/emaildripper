"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success("Copied");
        } catch {
          toast.error("Could not copy");
        }
      }}
    >
      {label}
    </Button>
  );
}
