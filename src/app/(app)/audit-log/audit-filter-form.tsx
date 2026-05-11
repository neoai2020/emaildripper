"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuditFilterForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [pending, startTransition] = useTransition();

  function apply(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      const p = new URLSearchParams();
      const trimmed = q.trim();
      if (trimmed) p.set("action", trimmed);
      router.push(trimmed ? `/audit-log?${p.toString()}` : "/audit-log");
    });
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <label htmlFor="audit-filter" className="text-xs text-muted-foreground">
          Filter action contains
        </label>
        <Input
          id="audit-filter"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Part of an action name"
          className="h-9 w-64 font-mono text-xs"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Apply
      </Button>
    </form>
  );
}
