import { MasterLeadDeleteButton } from "@/app/(app)/leads/master/master-lead-delete-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServiceSupabase } from "@/lib/db";
import { formatUtcDateTime } from "@/lib/format-display";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";

function sanitizeQ(raw: string) {
  return raw.replace(/[^a-zA-Z0-9@._+-]/g, "").slice(0, 120);
}

export default async function MasterLeadsPage({ searchParams }: { searchParams: { q?: string } }) {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Master leads" description={UNCONFIGURED_APP} />;
  }

  const qRaw = (searchParams.q ?? "").trim();
  const q = sanitizeQ(qRaw);

  let query = sb
    .from("master_leads")
    .select("id,email,first_name,last_name,source_label,first_seen_at")
    .order("first_seen_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Master leads" description="Every email ever imported. Up to 200 most recent addresses are shown here." />

      <form method="get" className="mb-6 flex max-w-md flex-wrap items-end gap-2">
        <div className="grid flex-1 gap-1">
          <Label htmlFor="ml-q">Search email</Label>
          <Input id="ml-q" name="q" defaultValue={qRaw} placeholder="contains…" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {(rows ?? []).length === 0 ? (
        <EmptyState
          title="No master leads"
          description="Import a CSV on the leads import page to seed addresses you can reuse across campaigns."
          actionHref="/leads/import"
          actionLabel="Import leads"
        />
      ) : (
        <div className="rounded-xl border border-border/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>First seen (UTC)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows!.map((r) => (
                <TableRow key={r.id as string}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.source_label ?? "—"}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                    {formatUtcDateTime(r.first_seen_at as string | null)}
                  </TableCell>
                  <TableCell className="text-right">
                    <MasterLeadDeleteButton id={r.id as string} email={r.email as string} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
