"use client";

import { HelpCircle } from "lucide-react";

import { useAppSettings } from "@/components/app-settings-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TOOLTIPS, type TooltipId } from "@/lib/tooltips";
import { cn } from "@/lib/utils";

export function HelpTip({
  id,
  className,
}: {
  id: TooltipId;
  className?: string;
}) {
  const { tooltipsEnabled } = useAppSettings();
  const entry = TOOLTIPS[id];
  if (!tooltipsEnabled || !entry) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
          className
        )}
        aria-label={`Help: ${entry.title}`}
      >
        <HelpCircle className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left">
        <div className="font-medium">{entry.title}</div>
        <p className="mt-1 font-normal text-background/90">{entry.body}</p>
      </TooltipContent>
    </Tooltip>
  );
}
