"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createPreviewCampaignAction } from "@/app/(app)/campaigns/actions";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultCampaignTag } from "@/lib/tag";
import { normalizeEmail, isValidEmailSyntax } from "@/lib/validation/email";

type Ar = { id: string; name: string };

export function CampaignWizard({ autoresponders }: { autoresponders: Ar[] }) {
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
  const [quietTz, setQuietTz] = useState("Europe/Vienna");
  const [maxConcurrentPerTick, setMaxConcurrentPerTick] = useState(3);
  const [tag, setTag] = useState("");

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
            <div className="grid gap-2">
              <Label htmlFor="c-name">Campaign name</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-src">Source label (optional)</Label>
              <Input
                id="c-src"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder="blackfriday-list-2026"
              />
            </div>
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
              <div className="grid gap-2">
                <Label htmlFor="c-ar">Account</Label>
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
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>One email per line (max 5000 in this MVP slice).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <div className="grid gap-2">
              <Label htmlFor="c-win">Time window (hours)</Label>
              <Input
                id="c-win"
                type="number"
                min={1}
                value={timeWindowHours}
                onChange={(e) => setTimeWindowHours(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-start">Start (local)</Label>
              <Input
                id="c-start"
                type="datetime-local"
                value={startsAtLocal}
                onChange={(e) => setStartsAtLocal(e.target.value)}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={quietEnabled}
                  onChange={(e) => setQuietEnabled(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Quiet hours enabled
              </label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-qs">Quiet start</Label>
              <Input id="c-qs" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-qe">Quiet end</Label>
              <Input id="c-qe" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="c-tz">IANA timezone</Label>
              <Input id="c-tz" value={quietTz} onChange={(e) => setQuietTz(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-mpt">Max concurrent per tick</Label>
              <Input
                id="c-mpt"
                type="number"
                min={1}
                max={10}
                value={maxConcurrentPerTick}
                onChange={(e) => setMaxConcurrentPerTick(Number(e.target.value))}
              />
            </div>
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
