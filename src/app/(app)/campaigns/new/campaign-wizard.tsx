"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";

import {
  createPreviewCampaignAction,
  dryRunScheduleWizardAction,
  uploadCampaignCsvAction,
  validateCampaignWizardLeadsAction,
  type WizardLeadValidation,
} from "@/app/(app)/campaigns/actions";
import { HelpTip } from "@/components/help-tip";
import { LabeledField } from "@/components/labeled-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultCampaignTag } from "@/lib/tag";
import type { CampaignCloneDraft } from "@/lib/campaign/cloneDraft";
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
  cloneFrom = null,
}: {
  autoresponders: Ar[];
  templates: CampaignTemplateRow[];
  defaultTz: string;
  cloneFrom?: { draft: CampaignCloneDraft; sourceName: string } | null;
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
  const [validation, setValidation] = useState<WizardLeadValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [scheduleLeadCap, setScheduleLeadCap] = useState(1);
  const [dryRunResult, setDryRunResult] = useState<Awaited<ReturnType<typeof dryRunScheduleWizardAction>> | null>(
    null
  );

  const cloneAppliedRef = useRef(false);
  useEffect(() => {
    if (!cloneFrom || cloneAppliedRef.current) return;
    cloneAppliedRef.current = true;
    const d = cloneFrom.draft;
    setName(d.name);
    setSourceLabel(d.sourceLabel ?? "");
    setAutoresponderId(d.autoresponderId);
    setEmailsText(d.emailsText);
    setTimeWindowHours(d.timeWindowHours);
    setQuietEnabled(d.quietHoursEnabled);
    setQuietStart(d.quietHoursStart);
    setQuietEnd(d.quietHoursEnd);
    setQuietTz(d.quietHoursTz.trim() || defaultTz);
    setMaxConcurrentPerTick(d.maxConcurrentPerTick);
    setSourceCsvPath(null);
    setTag("");
    setTemplateId("");
    setDryRunResult(null);
    setValidation(null);
    setStep(1);
    toast.info(`Copied from "${cloneFrom.sourceName}". Review each step before creating a preview.`);
  }, [cloneFrom, defaultTz]);

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

  useEffect(() => {
    if (step !== 3) return;
    const handle = setTimeout(() => {
      void (async () => {
        setValidating(true);
        try {
          const lines = emailsText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          if (lines.length === 0) {
            setValidation(null);
            return;
          }
          const v = await validateCampaignWizardLeadsAction(lines.slice(0, 5000));
          setValidation(v);
          setScheduleLeadCap((cur) => {
            if (v.eligible <= 0) return 1;
            if (cur <= 0 || cur > v.eligible) return v.eligible;
            return cur;
          });
        } catch {
          setValidation(null);
        } finally {
          setValidating(false);
        }
      })();
    }, 500);
    return () => clearTimeout(handle);
  }, [emailsText, step]);

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
    if (step === 3 && (!validation || validation.eligible < 1)) {
      toast.error("Wait for validation — no eligible addresses yet.");
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

  function runDrySchedule() {
    if (!selectedAr) return;
    if (!tag.trim()) {
      toast.error("Tag is required before a dry schedule.");
      return;
    }
    const startsAtIso = new Date(startsAtLocal).toISOString();
    const eligible = validation?.eligible ?? parsedEmails.length;
    const cap = Math.min(scheduleLeadCap, Math.max(1, eligible));
    startTransition(async () => {
      try {
        const r = await dryRunScheduleWizardAction({
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
          scheduleLeadLimit: cap,
        });
        setDryRunResult(r);
        toast.success("Dry schedule ready — nothing was saved.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Dry schedule failed");
      }
    });
  }

  function downloadDryCsv() {
    if (!dryRunResult?.rows?.length) return;
    const header = "email,scheduled_at";
    const body = dryRunResult.rows.map((row) => `${row.email},${row.scheduled_at}`).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dry-run-schedule.csv";
    a.click();
    URL.revokeObjectURL(url);
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
        const eligible = validation?.eligible ?? parsedEmails.length;
        const cap = Math.min(scheduleLeadCap, Math.max(1, eligible));
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
          scheduleLeadLimit: cap,
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
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Parsed valid unique emails:{" "}
                <span className="font-mono text-foreground">{parsedEmails.length}</span>
              </span>
              <HelpTip id="wizard.validation" />
              {validating ? <span className="text-xs">Validating…</span> : null}
            </div>

            {validation ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-border/80 bg-card/40 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Non-empty lines</p>
                  <p className="font-mono text-lg text-foreground">{validation.total_non_empty_lines}</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card/40 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Valid syntax (unique)</p>
                  <p className="font-mono text-lg text-foreground">{validation.valid_syntax_unique}</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card/40 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Duplicate in file</p>
                  <p className="font-mono text-lg text-foreground">{validation.duplicate_in_file}</p>
                  {validation.duplicate_sample.length ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{validation.duplicate_sample.join(", ")}</p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-border/80 bg-card/40 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Suppressed</p>
                  <p className="font-mono text-lg text-foreground">{validation.suppressed}</p>
                  {validation.suppressed_sample.length ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{validation.suppressed_sample.join(", ")}</p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-border/80 bg-card/40 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">MX fail / ok</p>
                  <p className="font-mono text-lg text-foreground">
                    {validation.mx_fail} / {validation.mx_ok}
                  </p>
                  {validation.mx_fail_sample.length ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{validation.mx_fail_sample.join(", ")}</p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Eligible (max you can schedule)</p>
                  <p className="font-mono text-lg text-foreground">{validation.eligible}</p>
                </div>
              </div>
            ) : null}

            {validation && validation.eligible > 0 ? (
              <div className="space-y-2 rounded-lg border border-border/80 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>How many to use</span>
                  <HelpTip id="wizard.leadLimit" />
                </div>
                <input
                  type="range"
                  min={1}
                  max={validation.eligible}
                  value={Math.min(scheduleLeadCap, validation.eligible)}
                  onChange={(e) => setScheduleLeadCap(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Scheduling cap:{" "}
                  <span className="font-mono text-foreground">
                    {Math.min(scheduleLeadCap, validation.eligible)}
                  </span>{" "}
                  of {validation.eligible} eligible
                </p>
              </div>
            ) : null}
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

            <div className="flex flex-wrap items-center gap-2 border-t border-border/80 pt-4">
              <Button type="button" variant="secondary" onClick={runDrySchedule} disabled={pending}>
                Preview schedule without saving
              </Button>
              <HelpTip id="wizard.dryRunSchedule" />
              {dryRunResult?.rows?.length ? (
                <Button type="button" variant="outline" size="sm" onClick={downloadDryCsv}>
                  Download CSV ({dryRunResult.rows.length} rows)
                </Button>
              ) : null}
            </div>

            {dryRunResult ? (
              <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-amber-100">Dry run — nothing saved</p>
                <p className="text-xs text-muted-foreground">
                  {dryRunResult.total} sends between {dryRunResult.startsAt} and {dryRunResult.endsAt} (UTC end may extend
                  for caps).
                </p>
                <div className="max-h-48 overflow-auto rounded-md border border-border/60">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr>
                        <th className="p-2 font-medium">Email</th>
                        <th className="p-2 font-medium">scheduled_at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dryRunResult.rows.slice(0, 40).map((r) => (
                        <tr key={r.email + r.scheduled_at} className="border-t border-border/40">
                          <td className="p-2 font-mono">{r.email}</td>
                          <td className="p-2 font-mono text-muted-foreground">{r.scheduled_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {dryRunResult.rows.length > 40 ? (
                  <p className="text-xs text-muted-foreground">Showing first 40 rows — CSV has the full set.</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
