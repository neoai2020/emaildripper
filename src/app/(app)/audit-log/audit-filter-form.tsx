"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuditFilterForm({ initial }: { initial: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setQ(sp.get("action") ?? "");
  }, [sp]);

  useEffect(() => {
    const t = setTimeout(() => {
      const cur = sp.get("action") ?? "";
      if (q.trim() === cur.trim()) return;
      startTransition(() => {
        const p = new URLSearchParams(sp.toString());
        const trimmed = q.trim();
        if (trimmed) p.set("action", trimmed);
        else p.delete("action");
        router.replace(`/audit-log?${p.toString()}`);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [q, router, sp]);

  return (
    <div className="flex flex-wrap items-end gap-2">
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
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setQ("")}>
        Clear
      </Button>
    </div>
  );
}
