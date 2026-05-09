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

export default async function MasterLeadsPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Master leads" description="Connect Supabase to browse deduped emails." />;
  }

  const { data: rows, error } = await sb
    .from("master_leads")
    .select("email,first_name,last_name,source_label,first_seen_at")
    .order("first_seen_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Master leads" description="Most recent 200 rows." />
      <div className="rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>First seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No master leads yet.
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((r) => (
                <TableRow key={r.email}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.source_label ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {r.first_seen_at ? new Date(r.first_seen_at).toISOString() : "—"}
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
