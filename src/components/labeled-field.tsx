"use client";

import type { ReactNode } from "react";

import { HelpTip } from "@/components/help-tip";
import { Label } from "@/components/ui/label";
import type { TooltipId } from "@/lib/tooltips";
import { cn } from "@/lib/utils";

export function LabeledField({
  id,
  label,
  tipId,
  className,
  children,
}: {
  id?: string;
  label: string;
  tipId?: TooltipId;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center gap-2">
        {id ? (
          <Label htmlFor={id} className="flex items-center gap-1">
            {label}
          </Label>
        ) : (
          <span className="text-sm font-medium leading-none">{label}</span>
        )}
        {tipId ? <HelpTip id={tipId} /> : null}
      </div>
      {children}
    </div>
  );
}
