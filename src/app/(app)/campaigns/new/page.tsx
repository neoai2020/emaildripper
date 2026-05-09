import Link from "next/link";

import { CampaignWizard } from "@/app/(app)/campaigns/new/campaign-wizard";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getServiceSupabase } from "@/lib/db";
import { cn } from "@/lib/utils";

export default async function NewCampaignPage() {
  const sb = getServiceSupabase();
  const ars =
    sb != null
      ? (await sb.from("autoresponders").select("id,name").eq("is_active", true).order("name")).data ??
        []
      : [];

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <PageHeader
          title="New campaign"
          description="MVP wizard: basics → AR → leads → schedule → tag. Pre-flight preview UI comes next."
        />
        <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back
        </Link>
      </div>
      <CampaignWizard autoresponders={ars} />
    </>
  );
}
