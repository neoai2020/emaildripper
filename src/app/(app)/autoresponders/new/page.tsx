import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { AutoresponderForm } from "../autoresponder-form";
import { createAutoresponderAction } from "../actions";
import { cn } from "@/lib/utils";

export default function NewAutoresponderPage() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <PageHeader title="New autoresponder" description="Maps to one Make.com scenario + AR module." />
        <Link href="/autoresponders" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to list
        </Link>
      </div>
      <AutoresponderForm action={createAutoresponderAction} />
    </>
  );
}
