"use client";

import { useState } from "react";
import { toast } from "sonner";

import { exportAuditCsvAction } from "@/app/(app)/audit-log/actions";
import { Button } from "@/components/ui/button";

export function AuditExportButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const csv = await exportAuditCsvAction();
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Download started");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Export failed");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
