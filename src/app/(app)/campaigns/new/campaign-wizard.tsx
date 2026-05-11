"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";

import { createPreviewCampaignAction, uploadCampaignCsvAction } from "@/app/(app)/campaigns/actions";
import { HelpTip } from "@/components/help-tip";
import { LabeledField } from "@/components/labeled-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultCampaignTag } from "@/lib/tag";
import { normalizeEmail, isValidEmailSyntax } from "@/lib/validation/email";

type Ar = { id: string; name: string };

export type CampaignTemplateRow = {
  id: string;
  name: string;
  time_window_hours: number | null;
  max_concurrent_per_tick: number | null;
  quiet_hours_enabled: boolean | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

function hm(t: string | null | undefined, fallback: string) {
  if (!t) return fallback;
  const s = String(t).trim();
  return s.length >= 5 ? s.slice(0, 5) : fallback;
}

export function CampaignWizard({
  autoresponders,
  templates,
  defaultTz,
}: {
  autoresponders: Ar[];
  templates: CampaignTemplateRow[];
  defaultTz: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [autoresponderId, setAutoresponderId] = useState(autoresponders[0]?.id ?? "");
  const [emailsText, setEmailsText] = useState("");
  const [timeWindowHours, setTimeWindowHours] = useState(48);
  const [startsAtLocal, setStartsAtLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  });
  const [quietEnabled, setQuietEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("01:00");
  const [quietEnd, setQuietEnd] = useState("06:00");
  const [quietTz, setQuietTz] = useState(defaultTz);
  const [maxConcurrentPerTick, setMaxConcurrentPerTick] = useState(3);
  const [tag, setTag] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [sourceCsvPath, setSourceCsvPath] = useState<string | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);

  const selectedAr = useMemo(
    () => autoresponders.find((a) => a.id === autoresponderId),
    [autoresponders, autoresponderId]
  );

  useEffect(() => {
    if (step !== 5) return;
    if (tag.trim()) return;
    if (!selectedAr || !name.trim()) return;
    setTag(defaultCampaignTag(selectedAr.name, name));
  }, [step, tag, selectedAr, name]);

  const parsedEmails = useMemo(() => {
    const lines = emailsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const out: string[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const e = normalizeEmail(line.split(",")[0] ?? line);
      if (!isValidEmailSyntax(e)) continue;
      if (seen.has(e)) continue;
      seen.add(e);
      out.push(e);
    }
    return out;
  }, [emailsText]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTimeWindowHours(Number(t.time_window_hours ?? 48));
    setMaxConcurrentPerTick(Number(t.max_concurrent_per_tick ?? 3));
    setQuietEnabled(Boolean(t.quiet_hours_enabled));
    setQuietStart(hm(t.quiet_hours_start, "01:00"));
    setQuietEnd(hm(t.quiet_hours_end, "06:00"));
    toast.success(`Applied template: ${t.name}`);
  }

  async function mergeEmailsFromCsvFile(file: File) {
    const text = await file.text();
    const res = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (res.errors.length) {
      toast.error(res.errors[0]?.message ?? "CSV parse error");
      return;
    }
    const rows = res.data ?? [];
    const fields = res.meta.fields ?? [];
    const emailKey =
      fields.find((k) => /email|e-mail/i.test(String(k))) ?? fields[0] ?? "email";
    let added = 0;
    setEmailsText((prev) => {
      const seen = new Set<string>();
      for (const line of prev.split(/\r?\n/)) {
        const e = normalizeEmail(line.split(",")[0] ?? line);
        if (isValidEmailSyntax(e)) seen.add(e);
      }
      const found: string[] = [];
      for (const row of rows) {
        const cell = row[emailKey]?.trim() ?? "";
        if (!cell) continue;
        const e = normalizeEmail(cell.split(",")[0] ?? cell);
        if (!isValidEmailSyntax(e) || seen.has(e)) continue;
        seen.add(e);
        found.push(e);
      }
      if (found.length === 0) return prev;
      added = found.length;
      const base = prev.trim() ? `${prev.trim()}\n` : "";
      return base + found.join("\n");
    });
    if (added === 0) {
      toast.error("No new valid emails found in CSV.");
      return;
    }
    toast.success(`Merged ${added} new email(s) from CSV`);
  }

  async function onArchiveCsvUpload(file: File) {
    setCsvUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const { path } = await uploadCampaignCsvAction(fd);
      setSourceCsvPath(path);
      toast.success("Saved a copy of your CSV for your records.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCsvUploading(false);
    }
  }

  function regenerateTag() {
    if (!selectedAr || !name.trim()) {
      toast.error("Pick an autoresponder and campaign name first.");
      return;
    }
    setTag(defaultCampaignTag(selectedAr.name, name));
  }

  function next() {
    if (step === 1 && !name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    if (step === 2 && !autoresponderId) {
      toast.error("Select an autoresponder.");
      return;
    }
    if (step === 3 && parsedEmails.length === 0) {
      toast.error("Add at least one valid email.");
      return;
    }
    if (step === 4 && (!Number.isFinite(timeWindowHours) || timeWindowHours <= 0)) {
      toast.error("Time window must be a positive number of hours.");
      return;
    }
    if (step === 5 && !tag.trim()) {
      toast.error("Tag is required.");
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function createPreview() {
    if (!selectedAr) return;
    if (!tag.trim()) {
      toast.error("Tag is required.");
      return;
    }
    const startsAtIso = new Date(startsAtLocal).toISOString();
    startTransition(async () => {
      try {
        const { campaignId } = await createPreviewCampaignAction({
          name: name.trim(),
          sourceLabel: sourceLabel.trim() || null,
          autoresponderId,
          emails: parsedEmails,
          timeWindowHours,
          startsAtIso,
          quietHoursEnabled: quietEnabled,
          quietStart,
          quietEnd,
          quietTz,
          maxConcurrentPerTick,
          tag: tag.trim(),
          sourceCsvPath,
        });
        toast.success("Preview ready — review schedule, then launch.");
        router.push(`/campaigns/${campaignId}/preview`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Preview failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="font-mono text-xs text-muted-foreground">Step {step} / 5</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={back} disabled={step === 1 || pending}>
            Back
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={next} disabled={pending}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={createPreview} disabled={pending}>
              {pending ? "Building preview…" : "Build preview"}
            </Button>
          )}
        </div>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>Campaign name and optional source label.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LabeledField id="c-name" label="Campaign name" tipId="wizard.name">
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
            </LabeledField>
            <LabeledField id="c-src" label="Source label (optional)" tipId="wizard.sourceLabel">
              <Input
                id="c-src"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder="blackfriday-list-2026"
              />
            </LabeledField>
            {templates.length > 0 ? (
              <LabeledField id="c-tpl" label="Apply template (optional)" tipId="wizard.template">
                <select
                  id="c-tpl"
                  className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={templateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                >
                  <option value="">None</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </LabeledField>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Autoresponder</CardTitle>
            <CardDescription>Pick the destination Make webhook mapping.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {autoresponders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active autoresponders found. Create one first.
              </p>
            ) : (
              <LabeledField id="c-ar" label="Account" tipId="wizard.ar">
                <select
                  id="c-ar"
                  className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={autoresponderId}
                  onChange={(e) => setAutoresponderId(e.target.value)}
                >
                  {autoresponders.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </LabeledField>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>
              One email per line (up to 5,000), or import a CSV with a header row that includes an email column.
              Optionally save a copy of the same file for your records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <LabeledField id="c-csv-merge" label="Merge from CSV file" tipId="wizard.leads">
                <input
                  id="c-csv-merge"
                  type="file"
                  accept=".csv,text/csv"
                  className="max-w-xs text-xs file:mr-2 file:rounded file:border file:bg-muted file:px-2 file:py-1"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void mergeEmailsFromCsvFile(f);
                  }}
                />
              </LabeledField>
              <LabeledField id="c-csv-store" label="Save CSV copy (optional)" tipId="wizard.csvArchive">
                <input
                  id="c-csv-store"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={csvUploading}
                  className="max-w-xs text-xs file:mr-2 file:rounded file:border file:bg-muted file:px-2 file:py-1"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void onArchiveCsvUpload(f);
                  }}
                />
              </LabeledField>
            </div>
            {sourceCsvPath ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                Archived: {sourceCsvPath}
              </p>
            ) : null}
            <Textarea
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              rows={14}
              className="font-mono text-xs"
              placeholder={"you@example.com\nme@example.com"}
            />
            <p className="text-sm text-muted-foreground">
              Parsed valid unique emails:{" "}
              <span className="font-mono text-foreground">{parsedEmails.length}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Window length, start time, and quiet hours.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <LabeledField id="c-win" label="Time window (hours)" tipId="wizard.window">
              <Input
                id="c-win"
                type="number"
                min={1}
                value={timeWindowHours}
                onChange={(e) => setTimeWindowHours(Number(e.target.value))}
              />
            </LabeledField>
            <LabeledField id="c-start" label="Start (local)" tipId="wizard.start">
              <Input
                id="c-start"
                type="datetime-local"
                value={startsAtLocal}
                onChange={(e) => setStartsAtLocal(e.target.value)}
              />
            </LabeledField>
            <div className="grid gap-2 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium leading-none">
                <span>Quiet hours enabled</span>
                <HelpTip id="campaign.quiet" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={quietEnabled}
                  onChange={(e) => setQuietEnabled(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <span className="text-muted-foreground">Pause scheduling inside the window below</span>
              </label>
            </div>
            <LabeledField id="c-qs" label="Quiet start" tipId="campaign.quiet">
              <Input id="c-qs" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
            </LabeledField>
            <LabeledField id="c-qe" label="Quiet end" tipId="campaign.quiet">
              <Input id="c-qe" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
            </LabeledField>
            <LabeledField id="c-tz" label="IANA timezone" tipId="wizard.tz" className="md:col-span-2">
              <Input id="c-tz" value={quietTz} onChange={(e) => setQuietTz(e.target.value)} />
            </LabeledField>
            <LabeledField id="c-mpt" label="Max sends per worker check" tipId="campaign.mpt">
              <Input
                id="c-mpt"
                type="number"
                min={1}
                max={10}
                value={maxConcurrentPerTick}
                onChange={(e) => setMaxConcurrentPerTick(Number(e.target.value))}
              />
            </LabeledField>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tag & preview</CardTitle>
            <CardDescription>Tags must be unique across all campaigns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={regenerateTag}>
                Regenerate tag
              </Button>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="c-tag">Tag</Label>
                <HelpTip id="campaign.tag" />
              </div>
              <Input id="c-tag" value={tag} onChange={(e) => setTag(e.target.value)} className="font-mono text-xs" />
            </div>
            <p className="text-xs text-muted-foreground">
              MX validation runs now; suppressed emails are removed before the preview is created.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
