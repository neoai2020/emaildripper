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
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";

import { addSuppressionAction } from "./actions";

export default async function SuppressionPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Suppression list" description={UNCONFIGURED_APP} />;
  }

  const { data: rows, error } = await sb
    .from("suppression_list")
    .select("email,reason,source,added_at,notes")
    .order("added_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Suppression list" description="These emails will never be imported into campaigns." />

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

      <div className="rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No suppressions yet.
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((r) => (
                <TableRow key={r.email}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell className="text-xs">{r.reason}</TableCell>
                  <TableCell className="text-xs">{r.source}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {r.added_at ? new Date(r.added_at).toISOString() : "—"}
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
