"use client";

import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createCsvMappingAction } from "../actions";

const defaultJson = `{
  "Email": "email",
  "First Name": "first_name"
}`;

export function CsvMappingCreateForm() {
  return (
    <form action={createCsvMappingAction} className="mt-8 space-y-4 rounded-xl border border-border/80 p-4">
      <div className="grid gap-2">
        <Label htmlFor="m-name">Name</Label>
        <Input id="m-name" name="name" required placeholder="AWeber export" />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="m-json">Column map (JSON)</Label>
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
          Each key is the exact spreadsheet column heading; each value is the app field name. Use{" "}
          <span className="font-mono text-foreground/80">email</span>,{" "}
          <span className="font-mono text-foreground/80">first_name</span>, or{" "}
          <span className="font-mono text-foreground/80">last_name</span> where those apply; any other value is stored
          as a custom field on the lead.
        </p>
      </div>
      <Button type="submit">Save mapping</Button>
    </form>
  );
}
