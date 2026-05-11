"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { uploadSuppressionCsvAction } from "@/app/(app)/leads/suppression/actions";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SuppressionCsvUpload() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border/80 p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Upload suppression CSV</h3>
        <HelpTip id="suppression.csv" />
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Header row with an email column (name containing &quot;email&quot;). Adds manual suppressions in bulk.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            try {
              const r = await uploadSuppressionCsvAction(fd);
              setLast(`Added ${r.added} · already suppressed ${r.already} · invalid ${r.invalid}`);
              toast.success("Suppression CSV processed");
              e.currentTarget.reset();
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Upload failed");
            }
          });
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="sup-csv">CSV file</Label>
          <input
            id="sup-csv"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="max-w-xs text-xs file:mr-2 file:rounded file:border file:bg-muted file:px-2 file:py-1"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>
      {last ? <p className="mt-3 text-xs text-muted-foreground">{last}</p> : null}
    </div>
  );
}
