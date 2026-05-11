/** Normalizes `settings.randomization_settings` (jsonb) for `buildFeelsHumanSchedule`. */

import type { FeelsHumanInput } from "@/lib/scheduler/feelsHuman";

export type FeelsHumanRandParams = {
  gapFloor: number;
  burst2: number;
  burst3: number;
  intraBucketJitter: FeelsHumanInput["intraBucketJitter"];
};

const DEFAULTS: FeelsHumanRandParams = {
  gapFloor: 0.15,
  burst2: 0.2,
  burst3: 0.05,
  intraBucketJitter: "uniform",
};

function normalizeJitter(raw: unknown): FeelsHumanRandParams["intraBucketJitter"] {
  const s = String(raw ?? "uniform").trim().toLowerCase();
  if (s === "beta") return "beta";
  if (s === "triangle") return "triangle";
  return "uniform";
}

export function parseRandomizationSettings(raw: unknown): FeelsHumanRandParams {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const o = raw as Record<string, unknown>;
  const gap = Number(o.gap_probability_floor);
  const b2 = Number(o.burst_probability_2);
  const b3 = Number(o.burst_probability_3);
  return {
    gapFloor: Number.isFinite(gap) ? Math.min(0.55, Math.max(0.05, gap)) : DEFAULTS.gapFloor,
    burst2: Number.isFinite(b2) ? Math.min(0.6, Math.max(0.05, b2)) : DEFAULTS.burst2,
    burst3: Number.isFinite(b3) ? Math.min(0.35, Math.max(0.01, b3)) : DEFAULTS.burst3,
    intraBucketJitter: normalizeJitter(o.intra_bucket_jitter),
  };
}

export function defaultMaxPerTickFromSettings(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 3;
  const o = raw as Record<string, unknown>;
  const m = Number(o.max_per_tick_default);
  if (!Number.isFinite(m)) return 3;
  return Math.min(10, Math.max(1, Math.round(m)));
}
