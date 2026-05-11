import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";

import { updatePreferencesAction } from "../actions";

export default async function SettingsPreferencesPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Preferences" description={UNCONFIGURED_APP} />;
  }

  const { data: row, error } = await sb.from("settings").select("tooltips_enabled,default_tz").eq("id", 1).single();
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Preferences" description="Turn help bubbles on or off and set the default timezone label for new campaigns." />

      <form action={updatePreferencesAction} className="mt-8 max-w-md space-y-6 rounded-xl border border-border/80 p-6">
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
        </div>
        <Button type="submit">Save</Button>
      </form>
    </>
  );
}
