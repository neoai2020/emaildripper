"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NewCampaignError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("New campaign page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      <h1 className="font-heading text-xl font-semibold text-foreground">Could not load the campaign wizard</h1>
      <p className="text-sm text-muted-foreground">
        Try a hard refresh (Ctrl+Shift+R). If this keeps happening after a deploy, check the browser console and
        DigitalOcean runtime logs.
      </p>
      {error.message ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 font-mono text-xs text-destructive">
          {error.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline" }))}>
          All campaigns
        </Link>
      </div>
    </div>
  );
}

