import Link from "next/link";

import { CampaignWizard } from "@/app/(app)/campaigns/new/campaign-wizard";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getServiceSupabase } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export default async function NewCampaignPage() {
  const sb = getServiceSupabase();
  const ars =
    sb != null
      ? (await sb.from("autoresponders").select("id,name").eq("is_active", true).order("name")).data ??
        []
      : [];

  const templates =
    sb != null
      ? (await sb.from("campaign_templates").select("*").order("name")).data ?? []
      : [];

  const settings = sb != null ? await getSettings() : null;
  const defaultTz = settings?.default_tz ?? "Europe/Vienna";

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <PageHeader
          title="New campaign"
          description="Wizard with optional saved template, CSV paste or file merge, schedule, tag, then pre-flight preview."
        />
        <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back
        </Link>
      </div>
      <CampaignWizard
        autoresponders={ars}
        templates={templates}
        defaultTz={defaultTz}
      />
    </>
  );
}
