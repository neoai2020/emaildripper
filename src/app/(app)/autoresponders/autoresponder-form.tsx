"use client";

import { useFormStatus } from "react-dom";

import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { providerEnum, type AutoresponderInput } from "@/lib/schemas/autoresponder";
import { cn } from "@/lib/utils";

const providers = providerEnum.options;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-w-28">
      {pending ? "Saving…" : label}
    </Button>
  );
}

export type AutoresponderRow = {
  id: string;
  name: string;
  provider: AutoresponderInput["provider"];
  account_email: string;
  make_webhook_url: string;
  webhook_secret: string;
  daily_cap: number | null;
  warmup_enabled: boolean;
  warmup_started_at: string | null;
  is_active: boolean;
  notes: string | null;
};

export function AutoresponderForm({
  action,
  initial,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: Partial<AutoresponderRow>;
}) {
  const idPrefix = initial?.id ?? "new";

  return (
    <form action={action} className="max-w-2xl space-y-6">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Display name</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          placeholder="AWeber-Main"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-provider`}>Provider</Label>
        <select
          id={`${idPrefix}-provider`}
          name="provider"
          required
          defaultValue={initial?.provider ?? "aweber"}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
            "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          )}
        >
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-account_email`}>Account email</Label>
        <Input
          id={`${idPrefix}-account_email`}
          name="account_email"
          type="email"
          required
          defaultValue={initial?.account_email ?? ""}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-make_webhook_url`}>Make webhook URL</Label>
          <HelpTip id="ar.webhook" />
        </div>
        <Input
          id={`${idPrefix}-make_webhook_url`}
          name="make_webhook_url"
          type="url"
          required
          defaultValue={initial?.make_webhook_url ?? ""}
          placeholder="https://hook.eu2.make.com/…"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-webhook_secret`}>Webhook HMAC secret</Label>
          <HelpTip id="ar.hmac" />
        </div>
        <Textarea
          id={`${idPrefix}-webhook_secret`}
          name="webhook_secret"
          required
          rows={3}
          defaultValue={initial?.webhook_secret ?? ""}
          className="min-h-20 font-mono text-xs"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-daily_cap`}>Daily cap (optional)</Label>
          <HelpTip id="ar.dailyCap" />
        </div>
        <Input
          id={`${idPrefix}-daily_cap`}
          name="daily_cap"
          type="number"
          min={1}
          defaultValue={initial?.daily_cap ?? ""}
          placeholder="2000"
        />
      </div>

      <div className="flex flex-wrap items-center gap-8">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="warmup_enabled"
            defaultChecked={initial?.warmup_enabled ?? false}
            className="size-4 rounded border border-input accent-primary"
          />
          <span className="flex items-center gap-1">
            Warmup enabled
            <HelpTip id="ar.warmup" />
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initial?.is_active ?? true}
            className="size-4 rounded border border-input accent-primary"
          />
          Active
        </label>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-warmup_started_at`}>Warmup day-1 anchor (optional)</Label>
        <Input
          id={`${idPrefix}-warmup_started_at`}
          name="warmup_started_at"
          type="datetime-local"
          defaultValue={
            initial?.warmup_started_at
              ? initial.warmup_started_at.slice(0, 16)
              : ""
          }
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea id={`${idPrefix}-notes`} name="notes" rows={4} defaultValue={initial?.notes ?? ""} />
      </div>

      <div className="flex gap-3">
        <SubmitButton label={initial?.id ? "Save changes" : "Create"} />
      </div>
    </form>
  );
}
