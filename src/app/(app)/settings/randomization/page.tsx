import { PageHeader } from "@/components/page-header";
import { getServiceSupabase } from "@/lib/db";

import { RandomizationForm } from "./randomization-form";

export default async function SettingsRandomizationPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Randomization" description="Connect Supabase to edit tunables." />;
  }

  const { data: row, error } = await sb
    .from("settings")
    .select("randomization_settings,default_tz")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);

  const initial = (row.randomization_settings ?? {}) as Record<string, unknown>;

  return (
    <>
      <PageHeader
        title="Randomization tuning"
        description="Adjust feels-human pacing parameters. The chart previews a synthetic 240-lead campaign."
      />
      <div className="mt-8">
        <RandomizationForm initial={initial} defaultTz={row.default_tz ?? "Europe/Vienna"} />
      </div>
    </>
  );
}
