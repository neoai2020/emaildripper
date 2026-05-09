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

import { createCsvMappingAction, deleteCsvMappingAction } from "../actions";

export default async function CsvMappingsPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="CSV column mappings" description="Connect Supabase to manage saved maps." />;
  }

  const { data: rows, error } = await sb
    .from("csv_column_mappings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader
        title="CSV column mappings"
        description='Store JSON field maps (e.g. {"email":"Email Address"}) for reuse across imports.'
      />

      <form action={createCsvMappingAction} className="mt-8 space-y-4 rounded-xl border border-border/80 p-4">
        <div className="grid gap-2">
          <Label htmlFor="m-name">Name</Label>
          <Input id="m-name" name="name" required placeholder="AWeber export" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="m-json">Field map JSON</Label>
          <Textarea
            id="m-json"
            name="field_map_json"
            rows={6}
            className="font-mono text-xs"
            defaultValue={'{\n  "email": "Email"\n}'}
          />
        </div>
        <Button type="submit">Save mapping</Button>
      </form>

      <div className="mt-10 rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  No mappings yet.
                </TableCell>
              </TableRow>
            ) : (
              rows!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {r.created_at ? new Date(r.created_at as string).toISOString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={deleteCsvMappingAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        Delete
                      </Button>
                    </form>
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
