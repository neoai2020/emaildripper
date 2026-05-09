import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServiceSupabase } from "@/lib/db";

export default async function AuditLogPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Audit log" description="Connect Supabase to read the audit log." />;
  }

  const { data: rows, error } = await sb
    .from("audit_log")
    .select("id,at,action,entity_type,entity_id,details")
    .order("at", { ascending: false })
    .limit(150);
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Audit log" description="Recent state-changing actions (last 150 rows)." />

      <div className="mt-8 rounded-xl border border-border/80">
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
                  No audit entries yet.
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
                  <TableCell className="max-w-md truncate font-mono text-[10px] text-muted-foreground">
                    {r.details ? JSON.stringify(r.details) : "{}"}
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
