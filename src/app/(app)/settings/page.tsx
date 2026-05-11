import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings/preferences", label: "Preferences", desc: "Tooltips and default timezone." },
  { href: "/settings/randomization", label: "Randomization", desc: "Natural-looking send spacing defaults." },
  { href: "/settings/cron", label: "Scheduled sender", desc: "Address your external timer should call every minute." },
  { href: "/settings/backups", label: "Backups", desc: "Extra copies and retention hints." },
  { href: "/settings/danger", label: "Danger zone", desc: "Destructive actions." },
] as const;

export default function SettingsOverviewPage() {
  return (
    <>
      <PageHeader title="Settings" description="Sending behavior, on-screen hints, and maintenance shortcuts." />
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
