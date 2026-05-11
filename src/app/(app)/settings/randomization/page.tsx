import { PageHeader } from "@/components/page-header";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";

import { RandomizationForm } from "./randomization-form";

export default async function SettingsRandomizationPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return <PageHeader title="Randomization" description={UNCONFIGURED_APP} />;
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
        description="Tune natural-looking send spacing. The chart shows a sample 240-person campaign for comparison."
      />
      <div className="mt-8">
        <RandomizationForm initial={initial} defaultTz={row.default_tz ?? "Europe/Vienna"} />
      </div>
    </>
  );
}
