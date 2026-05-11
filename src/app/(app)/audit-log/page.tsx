import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { AuditExportButton } from "@/app/(app)/audit-log/audit-export-button";
import { AuditFilterForm } from "@/app/(app)/audit-log/audit-filter-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";
import { cn } from "@/lib/utils";

function summarizeAuditDetails(details: unknown): string {
  if (details == null) return "—";
  if (typeof details === "string") {
    return details.length > 400 ? `${details.slice(0, 400)}…` : details;
  }
  if (typeof details !== "object" || Array.isArray(details)) {
    return String(details).slice(0, 400);
  }
  const entries = Object.entries(details as Record<string, unknown>);
  if (entries.length === 0) return "—";
  return entries
    .map(([k, v]) => {
      const label = k.replace(/_/g, " ");
      if (v == null) return `${label}: —`;
      if (typeof v === "object") return `${label}: (see export for full detail)`;
      return `${label}: ${String(v)}`;
    })
    .join(" · ")
    .slice(0, 500);
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string };
}) {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Audit log" description={UNCONFIGURED_APP} />;
  }

  const rawFilter = (searchParams.action ?? "").trim();
  const safeFilter = rawFilter.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 64);

  let q = sb
    .from("audit_log")
    .select("id,at,action,entity_type,entity_id,details")
    .order("at", { ascending: false })
    .limit(150);
  if (safeFilter) {
    q = q.ilike("action", `%${safeFilter}%`);
  }

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Audit log" description="Recent important changes in your account (last 150 entries, filterable)." />
        <div className="flex flex-wrap items-center gap-2">
          <AuditFilterForm initial={rawFilter} />
          <AuditExportButton />
          <Link href="/help" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Help
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When (UTC)</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Id</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No audit entries match this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    {r.at ? new Date(r.at as string).toISOString() : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{r.action}</TableCell>
                  <TableCell className="text-xs">{r.entity_type}</TableCell>
                  <TableCell className="max-w-[100px] truncate font-mono text-[10px] text-muted-foreground">
                    {r.entity_id ? String(r.entity_id) : "—"}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-[11px] text-muted-foreground">
                    {summarizeAuditDetails(r.details)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
