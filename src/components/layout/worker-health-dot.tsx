"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { cn } from "@/lib/utils";

type HealthBody = {
  ok?: boolean;
  configured?: boolean;
  level?: "ok" | "warn" | "error";
  seconds_since_success?: number | null;
  seconds_since_tick_attempt?: number | null;
  stale?: boolean;
};

function formatAgo(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "unknown";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export function WorkerHealthDot() {
  const q = useQuery({
    queryKey: ["worker-health"],
    queryFn: async () => {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json()) as HealthBody;
      return json;
    },
    refetchInterval: 30_000,
  });

  const h = q.data;
  const level = h?.level ?? "error";
  const configured = h?.configured !== false;

  const color =
    level === "ok" ? "bg-emerald-500" : level === "warn" ? "bg-amber-500" : "bg-red-500";

  const ago =
    h?.seconds_since_success != null
      ? formatAgo(h.seconds_since_success)
      : formatAgo(h?.seconds_since_tick_attempt);

  const label = !configured
    ? "Worker status unavailable (database not configured)."
    : `Worker last ran: ${ago}. Open the dashboard for full health.`;

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none ring-offset-background focus-visible:ring-3 focus-visible:ring-ring/60",
        "hover:bg-sidebar-accent/60"
      )}
      aria-label={label}
      title={`${label} — Dashboard`}
    >
      <span className="relative flex size-2.5">
        <span className={cn("absolute inline-flex size-full rounded-full opacity-75", color)} />
        <span className={cn("relative inline-flex size-2.5 rounded-full", color)} />
      </span>
    </Link>
  );
}
