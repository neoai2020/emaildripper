"use client";

import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

import { bulkUpsertMasterLeadsAction } from "@/app/(app)/leads/import/actions";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Col = { key: string; label: string };

export type CsvMappingOption = {
  id: string;
  name: string;
  field_map: Record<string, unknown>;
};

export function CsvImportClient({ mappings }: { mappings: CsvMappingOption[] }) {
  const [text, setText] = useState("");
  const [cols, setCols] = useState<Col[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [emailCol, setEmailCol] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [checkResult, setCheckResult] = useState<Record<string, unknown> | null>(null);
  const [pending, startTransition] = useTransition();
  const [mappingId, setMappingId] = useState("");

  function applySavedMapping(id: string) {
    setMappingId(id);
    if (!id) return;
    const m = mappings.find((x) => x.id === id);
    if (!m) return;
    if (cols.length === 0) {
      toast.info("Parse CSV first, then pick a saved mapping.");
      return;
    }
    const fm = m.field_map;
    const headerRaw = fm.email ?? fm.Email ?? fm["email_address"];
    const header = headerRaw != null ? String(headerRaw).trim() : "";
    if (!header) {
      toast.error('Mapping has no "email" key in field_map JSON.');
      return;
    }
    const match = cols.find((c) => c.label.trim().toLowerCase() === header.toLowerCase());
    if (!match) {
      toast.error(`No column header matching “${header}”.`);
      return;
    }
    setEmailCol(match.key);
    toast.success(`Email column: ${match.label}`);
  }

  const extracted = useMemo(() => {
    if (!emailCol || rows.length === 0) return [];
    const idx = cols.findIndex((c) => c.key === emailCol);
    if (idx < 0) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const cell = r[idx]?.trim() ?? "";
      if (!cell) continue;
      const e = cell.split(",")[0]?.trim() ?? cell;
      if (!e.includes("@")) continue;
      const lower = e.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      out.push(lower);
    }
    return out;
  }, [cols, rows, emailCol]);

  function parseCsv() {
    const res = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
    const data = (res.data as string[][]).filter((r) => r.some((c) => String(c).trim()));
    if (data.length === 0) {
      toast.error("No rows parsed.");
      return;
    }
    const header = data[0]!.map((h, i) => ({
      key: `col_${i}`,
      label: String(h || `Column ${i + 1}`).trim(),
    }));
    const body = data.slice(1).map((r) => header.map((_, i) => String(r[i] ?? "").trim()));
    setCols(header);
    setRows(body);
    const guess = header.find((c) => /email|e-mail/i.test(c.label))?.key ?? header[0]!.key;
    setEmailCol(guess);
    toast.success(`${body.length} rows · ${header.length} columns`);
  }

  function runChecks() {
    if (extracted.length === 0) {
      toast.error("Pick an email column with addresses.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/leads/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ emails: extracted }),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok || !json.ok) throw new Error(String(json.error ?? "Request failed"));
        setCheckResult(json);
        toast.success("Validation complete");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Check failed");
      }
    });
  }

  function upsert() {
    if (extracted.length === 0) {
      toast.error("Nothing to import.");
      return;
    }
    startTransition(async () => {
      try {
        const { upserted } = await bulkUpsertMasterLeadsAction({
          emails: extracted,
          sourceLabel: sourceLabel.trim() || null,
        });
        toast.success(`Upserted ${upserted} emails into master leads`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Label htmlFor="csv">Paste CSV (include header row)</Label>
        <HelpTip id="leads.import" />
      </div>
      <Textarea
        id="csv"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="font-mono text-xs"
        placeholder="email,first_name&#10;a@b.com,Ann"
      />
      <Button type="button" variant="secondary" onClick={parseCsv} disabled={pending || !text.trim()}>
        Parse CSV
      </Button>

      {cols.length > 0 ? (
        <div className="grid gap-4 rounded-xl border border-border/80 p-4">
          <div className="grid gap-2 md:max-w-md">
            <Label>Email column</Label>
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={emailCol}
              onChange={(e) => setEmailCol(e.target.value)}
            >
              {cols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {mappings.length > 0 ? (
            <div className="grid gap-2 md:max-w-md">
              <Label>Saved column mapping (optional)</Label>
              <select
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                value={mappingId}
                onChange={(e) => applySavedMapping(e.target.value)}
              >
                <option value="">None</option>
                {mappings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid gap-2 md:max-w-md">
            <Label htmlFor="src">Source label (optional)</Label>
            <Input id="src" value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">
            Extracted <span className="font-mono text-foreground">{extracted.length}</span> unique-looking
            addresses from column mapping.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={runChecks} disabled={pending}>
              Run MX / suppression check
            </Button>
            <Button type="button" onClick={upsert} disabled={pending}>
              Upsert to master leads
            </Button>
          </div>
        </div>
      ) : null}

      {checkResult ? (
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs">
          {JSON.stringify(checkResult, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
