import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  AutoresponderForm,
  type AutoresponderRow,
} from "@/app/(app)/autoresponders/autoresponder-form";
import { updateAutoresponderAction } from "@/app/(app)/autoresponders/actions";
import { getServiceSupabase } from "@/lib/db";
import { cn } from "@/lib/utils";

export default async function AutoresponderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = getServiceSupabase();
  if (!sb) {
    return (
      <>
        <PageHeader title="Autoresponder" description="Connect Supabase to edit this record." />
      </>
    );
  }

  const { data, error } = await sb.from("autoresponders").select("*").eq("id", params.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();

  const initial: AutoresponderRow = {
    id: data.id,
    name: data.name,
    provider: data.provider as AutoresponderRow["provider"],
    account_email: data.account_email,
    make_webhook_url: data.make_webhook_url,
    webhook_secret: data.webhook_secret,
    daily_cap: data.daily_cap,
    warmup_enabled: data.warmup_enabled,
    warmup_started_at: data.warmup_started_at,
    is_active: data.is_active,
    notes: data.notes,
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <PageHeader title={data.name} description="Webhook URL, HMAC secret, caps, and warmup." />
        <Link href="/autoresponders" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to list
        </Link>
      </div>
      <AutoresponderForm
        initial={initial}
        action={updateAutoresponderAction.bind(null, params.id)}
      />
    </>
  );
}
