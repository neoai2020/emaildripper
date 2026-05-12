import {
  AlertCircle,
  Check,
  Circle,
  Clock,
  Loader2,
  Pause,
  Play,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const leadStatuses = new Set(["sent", "pending", "processing", "failed"]);

export type StatusBadgeKind = "campaign" | "lead";

export function StatusBadge({
  status,
  kind = "campaign",
  className,
}: {
  status: string;
  kind?: StatusBadgeKind;
  className?: string;
}) {
  const s = status.toLowerCase();
  const isLead = kind === "lead" || leadStatuses.has(s);

  if (isLead && (s === "sent" || s === "pending" || s === "processing" || s === "failed")) {
    if (s === "sent") {
      return (
        <span
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 text-xs font-medium text-emerald-400",
            className
          )}
        >
          <Check className="size-3 shrink-0" aria-hidden />
          Sent
        </span>
      );
    }
    if (s === "pending") {
      return (
        <span
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2 text-xs font-medium text-zinc-300",
            className
          )}
        >
          <Circle className="size-2.5 shrink-0 fill-current" aria-hidden />
          Pending
        </span>
      );
    }
    if (s === "processing") {
      return (
        <span
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 text-xs font-medium text-primary",
            className
          )}
        >
          <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
          Processing
        </span>
      );
    }
    return (
      <span
        className={cn(
          "inline-flex h-5 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 text-xs font-medium text-red-400",
          className
        )}
      >
        <AlertCircle className="size-3 shrink-0" aria-hidden />
        Failed
      </span>
    );
  }

  const map: Record<string, { label: string; Icon: typeof Circle; cls: string; pulse?: boolean }> = {
    draft: { label: "Draft", Icon: Circle, cls: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300" },
    previewing: { label: "Previewing", Icon: Pause, cls: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
    scheduled: { label: "Scheduled", Icon: Clock, cls: "border-primary/30 bg-primary/10 text-primary" },
    running: {
      label: "Running",
      Icon: Play,
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      pulse: true,
    },
    paused: { label: "Paused", Icon: Pause, cls: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
    completed: { label: "Completed", Icon: Check, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
    cancelled: { label: "Cancelled", Icon: X, cls: "border-red-500/30 bg-red-500/10 text-red-300" },
    failed: { label: "Failed", Icon: AlertCircle, cls: "border-red-500/30 bg-red-500/10 text-red-300" },
  };

  const m = map[s] ?? {
    label: status,
    Icon: Circle,
    cls: "border-border bg-muted/30 text-muted-foreground",
  };

  const Icon = m.Icon;

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-xs font-medium",
        m.cls,
        className
      )}
    >
      <Icon className={cn("size-3 shrink-0", m.pulse && "motion-safe:animate-pulse")} aria-hidden />
      {m.label}
    </span>
  );
}
