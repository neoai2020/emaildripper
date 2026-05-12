import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";

import { updatePreferencesAction } from "../actions";

function tierFromLimit(limit: number | null | undefined): string {
  if (limit == null) return "custom";
  if (limit === 1000) return "free";
  if (limit === 10_000) return "core";
  return "custom";
}

export default async function SettingsPreferencesPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Preferences" description={UNCONFIGURED_APP} />;
  }

  const { data: row, error } = await sb
    .from("settings")
    .select("tooltips_enabled,default_tz,make_ops_monthly_limit")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);

  const limit = row.make_ops_monthly_limit != null ? Number(row.make_ops_monthly_limit) : null;
  const tierDefault = tierFromLimit(limit);
  const customDefault =
    tierDefault === "custom" && limit != null && Number.isFinite(limit) ? String(limit) : "";

  return (
    <>
      <PageHeader
        title="Preferences"
        description="Tooltips, default timezone label for new campaigns, and Make.com monthly usage limit for dashboard estimates."
      />

      <form action={updatePreferencesAction} className="mt-8 max-w-lg space-y-6 rounded-xl border border-border/80 p-6">
        <div className="flex items-center gap-3">
          <input
            id="tooltips_enabled"
            name="tooltips_enabled"
            type="checkbox"
            defaultChecked={row.tooltips_enabled !== false}
            className="size-4 accent-primary"
          />
          <Label htmlFor="tooltips_enabled" className="font-normal">
            Show contextual tooltips
          </Label>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="default_tz">Default timezone (IANA)</Label>
          <Input
            id="default_tz"
            name="default_tz"
            defaultValue={row.default_tz ?? "Europe/Vienna"}
            placeholder="Europe/Vienna"
          />
          <p className="text-xs text-muted-foreground">Used as the default label when scheduling new campaigns.</p>
        </div>

        <div className="grid gap-2 border-t border-border/80 pt-4">
          <Label htmlFor="make_ops_tier">Make.com tier limit (ops / month)</Label>
          <select
            id="make_ops_tier"
            name="make_ops_tier"
            defaultValue={tierDefault}
            className="h-9 w-full max-w-md rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="free">Free — 1,000</option>
            <option value="core">Core — 10,000</option>
            <option value="pro">Pro — 10,000 (+ rollover in Make)</option>
            <option value="teams">Teams — 10,000</option>
            <option value="custom">Custom number…</option>
          </select>
          <div className="grid gap-1">
            <Label htmlFor="make_ops_custom" className="text-xs text-muted-foreground">
              Custom limit (only when &quot;Custom&quot; is selected above)
            </Label>
            <Input
              id="make_ops_custom"
              name="make_ops_custom"
              type="number"
              min={1}
              defaultValue={customDefault}
              placeholder="e.g. 25000"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The dashboard compares estimated monthly ops (about 2 × successful sends this UTC month) to this limit.
          </p>
        </div>

        <Button type="submit">Save changes</Button>
      </form>
    </>
  );
}
