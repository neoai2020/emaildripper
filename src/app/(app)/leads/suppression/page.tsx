import { SuppressionCsvUpload } from "@/app/(app)/leads/suppression/suppression-csv-client";
import { addSuppressionAction } from "@/app/(app)/leads/suppression/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  return raw.replace(/[^a-zA-Z0-9@._+%-]/g, "").slice(0, 120);
}

export default async function SuppressionPage({ searchParams }: { searchParams: { q?: string } }) {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Suppression list" description={UNCONFIGURED_APP} />;
  }

  const qRaw = (searchParams.q ?? "").trim();
  const q = sanitizeQ(qRaw);

  let query = sb
    .from("suppression_list")
    .select("email,reason,source,added_at,notes")
    .order("added_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Suppression list" description="These emails will never be imported into campaigns." />

      <SuppressionCsvUpload />

      <form method="get" className="mb-6 flex max-w-md flex-wrap items-end gap-2">
        <div className="grid flex-1 gap-1">
          <Label htmlFor="sup-q">Search email</Label>
          <Input id="sup-q" name="q" defaultValue={qRaw} placeholder="contains…" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="mb-8 rounded-xl border border-border/80 p-4">
        <form action={addSuppressionAction} className="grid gap-3 md:grid-cols-[2fr_3fr_auto] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="sup-email">Email</Label>
            <Input id="sup-email" name="email" type="email" required placeholder="bad@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sup-notes">Notes (optional)</Label>
            <Textarea id="sup-notes" name="notes" rows={2} />
          </div>
          <Button type="submit">Add</Button>
        </form>
      </div>

      {(rows ?? []).length === 0 ? (
        <EmptyState
          title="No suppressions"
          description="Upload a CSV or add addresses manually to protect bounces and opt-outs."
          actionHref="/leads/import"
          actionLabel="Go to import"
        />
      ) : (
        <div className="rounded-xl border border-border/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Added (UTC)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows!.map((r) => (
                <TableRow key={r.email}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="text-xs">{r.reason ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.source ?? "—"}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                    {formatUtcDateTime(r.added_at as string | null)}
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
