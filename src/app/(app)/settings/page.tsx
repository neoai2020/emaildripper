import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings/preferences", label: "Preferences", desc: "Tooltips and default timezone." },
  { href: "/settings/alerts", label: "Alerts", desc: "Telegram and email destinations." },
  { href: "/settings/randomization", label: "Randomization", desc: "Feels-human pacing tunables." },
  { href: "/settings/cron", label: "Cron", desc: "Tick URL for your scheduler." },
  { href: "/settings/backups", label: "Backups", desc: "Retention and Supabase backups." },
  { href: "/settings/danger", label: "Danger zone", desc: "Destructive actions." },
] as const;

export default function SettingsOverviewPage() {
  return (
    <>
      <PageHeader title="Settings" description="Global configuration for the worker, UI, and alerts." />
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {links.map(({ href, label, desc }) => (
          <li key={href} className="rounded-xl border border-border/80 p-4">
            <Link href={href} className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 font-semibold")}>
              {label}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
