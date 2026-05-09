"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { updateRandomizationAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { buildFeelsHumanSchedule } from "@/lib/scheduler/feelsHuman";

type Rand = {
  max_per_tick_default?: number;
  gap_probability_floor?: number;
  burst_probability_2?: number;
  burst_probability_3?: number;
  intra_bucket_jitter?: string;
};

function demoHourly(
  mpt: number,
  gap: number,
  b2: number,
  b3: number,
  tz: string
): { hour: string; sends: number }[] {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 5);
  const end = new Date(start.getTime() + 48 * 3600_000);
  const times = buildFeelsHumanSchedule({
    count: 240,
    windowStart: start,
    windowEnd: end,
    timeZone: tz,
    quietHoursEnabled: true,
    quietStart: "01:00",
    quietEnd: "06:00",
    maxPerBucket: mpt,
    gapFloor: gap,
    burst2: b2,
    burst3: b3,
  });
  const bucketMs = 3600_000;
  const windowEnd = start.getTime() + 48 * bucketMs;
  const counts = new Map<number, number>();
  const maxIdx = 48;
  for (let i = 0; i <= maxIdx; i++) counts.set(i, 0);
  for (const t of times) {
    const x = t.getTime();
    if (x < start.getTime() || x > windowEnd) continue;
    const idx = Math.floor((x - start.getTime()) / bucketMs);
    counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }
  return Array.from({ length: Math.min(maxIdx + 1, 24) }, (_, i) => ({
    hour: `+${i}h`,
    sends: counts.get(i) ?? 0,
  }));
}

export function RandomizationForm({ initial, defaultTz }: { initial: Rand; defaultTz: string }) {
  const [mpt, setMpt] = useState(Number(initial.max_per_tick_default ?? 3));
  const [gap, setGap] = useState(Number(initial.gap_probability_floor ?? 0.15));
  const [b2, setB2] = useState(Number(initial.burst_probability_2 ?? 0.2));
  const [b3, setB3] = useState(Number(initial.burst_probability_3 ?? 0.05));
  const [jitter, setJitter] = useState(String(initial.intra_bucket_jitter ?? "uniform"));

  const hourly = useMemo(() => demoHourly(mpt, gap, b2, b3, defaultTz), [mpt, gap, b2, b3, defaultTz]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border/80 p-4">
        <h2 className="mb-4 font-heading text-sm font-semibold">Sample 48h / 240 leads (quiet 01:00–06:00)</h2>
        <div className="h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="sends" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <form action={updateRandomizationAction} className="max-w-lg space-y-6 rounded-xl border border-border/80 p-6">
        <input type="hidden" name="max_per_tick_default" value={mpt} />
        <input type="hidden" name="gap_probability_floor" value={gap} />
        <input type="hidden" name="burst_probability_2" value={b2} />
        <input type="hidden" name="burst_probability_3" value={b3} />
        <input type="hidden" name="intra_bucket_jitter" value={jitter} />

        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <Label>Max per tick (default)</Label>
            <span className="font-mono text-muted-foreground">{mpt}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={mpt}
            onChange={(e) => setMpt(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <Label>Gap probability floor</Label>
            <span className="font-mono text-muted-foreground">{gap.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.45}
            step={0.01}
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <Label>Burst ×2 probability</Label>
            <span className="font-mono text-muted-foreground">{b2.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.5}
            step={0.01}
            value={b2}
            onChange={(e) => setB2(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <Label>Burst ×3 probability</Label>
            <span className="font-mono text-muted-foreground">{b3.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.25}
            step={0.01}
            value={b3}
            onChange={(e) => setB3(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="jitter">Intra-bucket jitter</Label>
          <select
            id="jitter"
            value={jitter}
            onChange={(e) => setJitter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="uniform">uniform</option>
            <option value="beta">beta (reserved)</option>
          </select>
        </div>

        <Button type="submit">Save to database</Button>
        <p className="text-xs text-muted-foreground">
          Gap/burst probabilities here are applied when building campaign schedules (with per-campaign max per tick
          from the wizard).
        </p>
      </form>
    </div>
  );
}
