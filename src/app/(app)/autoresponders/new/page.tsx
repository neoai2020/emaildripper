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
        <PageHeader title="New autoresponder" description="One row here connects to one automated scenario in Make.com." />
        <Link href="/autoresponders" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to list
        </Link>
      </div>
      <AutoresponderForm action={createAutoresponderAction} />
    </>
  );
}
