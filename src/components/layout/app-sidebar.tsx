"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertOctagon,
  Ban,
  Bell,
  Clock,
  HardDrive,
  LayoutDashboard,
  LineChart,
  Mails,
  Radio,
  ScrollText,
  Settings,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Mails },
  { href: "/autoresponders", label: "Autoresponders", icon: Radio },
  { href: "/leads/master", label: "Master leads", icon: Users },
  { href: "/leads/suppression", label: "Suppression", icon: Ban },
  { href: "/templates/campaigns", label: "Campaign templates", icon: Shapes },
  { href: "/templates/csv-mappings", label: "CSV mappings", icon: Shapes },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/audit-log", label: "Audit log", icon: ScrollText },
] as const;

const settingsNav = [
  { href: "/settings", label: "Overview", icon: Settings },
  { href: "/settings/preferences", label: "Preferences", icon: SlidersHorizontal },
  { href: "/settings/alerts", label: "Alerts", icon: Bell },
  { href: "/settings/randomization", label: "Randomization", icon: Sparkles },
  { href: "/settings/cron", label: "Cron", icon: Clock },
  { href: "/settings/backups", label: "Backups", icon: HardDrive },
  { href: "/settings/danger", label: "Danger zone", icon: AlertOctagon },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border/80 bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-1 px-4 pb-4 pt-8">
        <div className="mb-4 px-2">
          <div className="font-heading text-sm font-semibold tracking-tight text-foreground">
            Drip Importer
          </div>
          <p className="mt-1 font-mono text-[10px] leading-tight text-muted-foreground">
            Human-paced imports
          </p>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 ease-out",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <Separator className="bg-sidebar-border" />
      <div className="flex flex-1 flex-col gap-1 px-4 py-4">
        <p className="px-2 pb-1 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Settings
        </p>
        <nav className="flex flex-col gap-0.5" aria-label="Settings">
          {settingsNav.map(({ href, label, icon: Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 ease-out",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
