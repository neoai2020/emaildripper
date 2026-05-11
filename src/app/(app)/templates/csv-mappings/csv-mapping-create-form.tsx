"use client";

import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createCsvMappingAction } from "../actions";

const defaultJson = "{}";

export function CsvMappingCreateForm() {
  return (
    <form action={createCsvMappingAction} className="mt-8 space-y-4 rounded-xl border border-border/80 p-4">
      <div className="grid gap-2">
        <Label htmlFor="m-name">Name</Label>
        <Input id="m-name" name="name" required placeholder="AWeber export" />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="m-json">Column map (spreadsheet heading per line)</Label>
          <HelpTip id="csv.fieldMap" />
        </div>
        <Textarea
          id="m-json"
          name="field_map_json"
          rows={6}
          className="font-mono text-xs"
          defaultValue={defaultJson}
        />
        <p className="text-xs text-muted-foreground">
          Each line pairs one spreadsheet column title with a field name: use email, first_name, or last_name where
          those apply; any other label is kept as an extra field on the address.
        </p>
      </div>
      <Button type="submit">Save mapping</Button>
    </form>
  );
}
