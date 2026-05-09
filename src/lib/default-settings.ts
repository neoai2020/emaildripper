/** Defaults for `public.settings` row id=1 (matches migration seed intent). */

export const DEFAULT_RANDOMIZATION_SETTINGS = {
  max_per_tick_default: 3,
  gap_probability_floor: 0.15,
  burst_probability_2: 0.2,
  burst_probability_3: 0.05,
  intra_bucket_jitter: "uniform",
} as const;
