"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CampaignsToolbar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();

  useEffect(() => {
    setQ(sp.get("q") ?? "");
  }, [sp]);

  useEffect(() => {
    const t = setTimeout(() => {
      const cur = sp.get("q") ?? "";
      if (q === cur) return;
      start(() => {
        const next = new URLSearchParams(sp.toString());
        if (q.trim()) next.set("q", q.trim());
        else next.delete("q");
        router.replace(`/campaigns?${next.toString()}`);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [q, router, sp]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search name or tag…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-xs"
        disabled={pending}
      />
      <Button
        type="button"
        variant={sp.get("recoverable") === "1" ? "default" : "outline"}
        size="sm"
        onClick={() => {
          const next = new URLSearchParams(sp.toString());
          if (next.get("recoverable") === "1") next.delete("recoverable");
          else next.set("recoverable", "1");
          router.push(`/campaigns?${next.toString()}`);
        }}
      >
        Cancelled (recoverable)
      </Button>
    </div>
  );
}
