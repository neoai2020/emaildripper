import Link from "next/link";

import { CampaignWizard } from "@/app/(app)/campaigns/new/campaign-wizard";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getServiceSupabase } from "@/lib/db";
import { loadCampaignCloneDraft } from "@/lib/campaign/cloneDraft";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: { clone?: string };
}) {
  const sb = getServiceSupabase();
  const cloneId = (searchParams.clone ?? "").trim();
  const clonePayload =
    sb != null && cloneId ? await loadCampaignCloneDraft(sb, cloneId) : null;

  let ars =
    sb != null
      ? (await sb.from("autoresponders").select("id,name").eq("is_active", true).order("name")).data ?? []
      : [];

  if (clonePayload && sb) {
    const needId = clonePayload.draft.autoresponderId;
    if (!ars.some((a) => a.id === needId)) {
      const { data: extra } = await sb.from("autoresponders").select("id,name").eq("id", needId).maybeSingle();
      if (extra) ars = [...ars, extra];
    }
  }

  const templates =
    sb != null
      ? (await sb.from("campaign_templates").select("*").order("name")).data ?? []
      : [];

  const settings = sb != null ? await getSettings() : null;
  const defaultTz = settings?.default_tz ?? "Europe/Vienna";

  const description = clonePayload
    ? `Copy of “${clonePayload.sourceName}” — same wizard as a new campaign; adjust anything, then create a preview.`
    : "Set up a new drip campaign.";

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <PageHeader title="New campaign" description={description} />
        <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          All campaigns
        </Link>
      </div>
      <CampaignWizard
        key={cloneId || "new"}
        autoresponders={ars}
        templates={templates}
        defaultTz={defaultTz}
        cloneFrom={clonePayload}
      />
    </>
  );
}
