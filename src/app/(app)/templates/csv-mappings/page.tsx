import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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

import { CsvMappingCreateForm } from "./csv-mapping-create-form";
import { deleteCsvMappingAction } from "../actions";

export default async function CsvMappingsPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="CSV column mappings" description={UNCONFIGURED_APP} />;
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
        description="Save column-name mappings so re-importing from the same source skips the mapping step."
      />

      <CsvMappingCreateForm />

      <div className="mt-10 rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created (UTC)</TableHead>
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
                  <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                    {formatUtcDateTime(r.created_at as string | null)}
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
