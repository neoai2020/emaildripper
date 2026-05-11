export type HourlyRow = { hour: string; sends: number };

export function buildHourlyBuckets(
  startsAt: Date,
  scheduledIso: string[],
  windowHours: number
): HourlyRow[] {
  const bucketMs = 3600_000;
  const windowEnd = startsAt.getTime() + windowHours * bucketMs;
  const counts = new Map<number, number>();
  const maxIdx = Math.max(0, Math.ceil((windowEnd - startsAt.getTime()) / bucketMs));

  for (let i = 0; i <= maxIdx; i++) counts.set(i, 0);

  for (const iso of scheduledIso) {
    const t = new Date(iso).getTime();
    if (t < startsAt.getTime() || t > windowEnd) continue;
    const idx = Math.floor((t - startsAt.getTime()) / bucketMs);
    counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }

  const rows: HourlyRow[] = [];
  for (let i = 0; i <= maxIdx; i++) {
    rows.push({
      hour: `+${i}h`,
      sends: counts.get(i) ?? 0,
    });
  }
  return rows;
}
