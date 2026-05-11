import { addMinutes, addSeconds } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export type FeelsHumanInput = {
  count: number;
  windowStart: Date;
  windowEnd: Date;
  timeZone: string;
  quietHoursEnabled: boolean;
  quietStart: string; // "HH:mm"
  quietEnd: string;
  maxPerBucket?: number;
  /** PRD tunables */
  gapFloor?: number;
  burst2?: number;
  burst3?: number;
  /** Seconds within a minute bucket — PRD randomization_settings.intra_bucket_jitter */
  intraBucketJitter?: "uniform" | "beta" | "triangle";
};

function parseHm(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  return { h: h || 0, m: m || 0 };
}

function minutesFromMidnight(d: Date, tz: string): number {
  const z = toZonedTime(d, tz);
  return z.getHours() * 60 + z.getMinutes();
}

function isQuietMinute(
  t: Date,
  tz: string,
  qStart: string,
  qEnd: string,
  enabled: boolean
): boolean {
  if (!enabled) return false;
  const { h: sh, m: sm } = parseHm(qStart);
  const { h: eh, m: em } = parseHm(qEnd);
  const startM = sh * 60 + sm;
  const endM = eh * 60 + em;
  const cur = minutesFromMidnight(t, tz);
  if (startM <= endM) return cur >= startM && cur < endM;
  return cur >= startM || cur < endM;
}

/** Enumerate minute offsets from windowStart that are not in quiet hours (local tz). */
function validMinuteOffsets(
  windowStart: Date,
  windowEnd: Date,
  tz: string,
  quiet: Pick<FeelsHumanInput, "quietHoursEnabled" | "quietStart" | "quietEnd">
): number[] {
  const total = Math.max(
    0,
    Math.floor((windowEnd.getTime() - windowStart.getTime()) / 60000)
  );
  const out: number[] = [];
  for (let i = 0; i < total; i++) {
    const t = addMinutes(windowStart, i);
    if (!isQuietMinute(t, tz, quiet.quietStart, quiet.quietEnd, quiet.quietHoursEnabled)) {
      out.push(i);
    }
  }
  return out;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw 0..maxPer inclusive with PRD-ish burst probabilities, targeting mean ~avg. */
function drawBucketCount(
  rand: () => number,
  avg: number,
  maxPer: number,
  gapFloor: number,
  burst2: number,
  burst3: number
): number {
  const clampedAvg = Math.min(maxPer, Math.max(0, avg));
  const p0 = Math.min(0.55, gapFloor + (maxPer - clampedAvg) * 0.08);
  const p3 = clampedAvg > 2.2 ? burst3 + (clampedAvg - 2) * 0.04 : burst3;
  const p2 = burst2 + Math.max(0, clampedAvg - 1) * 0.06;
  const p1 = Math.max(0, 1 - p0 - p2 - p3);
  const r = rand();
  let acc = 0;
  const pick = (p: number, v: number) => {
    acc += p;
    if (r <= acc) return v;
    return null;
  };
  return (
    pick(p0, 0) ??
    pick(p1, 1) ??
    pick(p2, 2) ??
    pick(p3, 3) ??
    Math.min(maxPer, Math.round(clampedAvg))
  );
}

/**
 * Returns `count` send timestamps between windowStart and windowEnd, respecting quiet hours.
 * Persists-ready: sorted ascending.
 */
function intraSecond(rand: () => number, mode: FeelsHumanInput["intraBucketJitter"]): number {
  if (mode === "triangle") {
    return Math.min(59, Math.floor(Math.abs(rand() * 2 - 1) * 30));
  }
  if (mode === "beta") {
    return Math.min(59, Math.floor(rand() * rand() * 59));
  }
  return Math.floor(rand() * 59);
}

export function buildFeelsHumanSchedule(input: FeelsHumanInput): Date[] {
  const {
    count,
    windowStart,
    windowEnd,
    timeZone,
    quietHoursEnabled,
    quietStart,
    quietEnd,
    maxPerBucket = 3,
    gapFloor = 0.15,
    burst2 = 0.2,
    burst3 = 0.05,
    intraBucketJitter = "uniform",
  } = input;

  if (count <= 0) return [];
  if (windowEnd <= windowStart) {
    throw new Error("windowEnd must be after windowStart");
  }

  const offsets = validMinuteOffsets(windowStart, windowEnd, timeZone, {
    quietHoursEnabled,
    quietStart,
    quietEnd,
  });
  if (offsets.length === 0) {
    throw new Error("No active minutes in the selected window (quiet hours cover it).");
  }

  const buckets = offsets.length;
  const avg = count / buckets;
  const rand = mulberry32(
    (windowStart.getTime() ^ (count << 3) ^ buckets) >>> 0
  );

  const perBucket: number[] = [];
  let assigned = 0;
  for (let b = 0; b < buckets; b++) {
    let k = drawBucketCount(rand, avg, maxPerBucket, gapFloor, burst2, burst3);
    k = Math.min(maxPerBucket, Math.max(0, k));
    perBucket.push(k);
    assigned += k;
  }

  let diff = count - assigned;
  let bi = 0;
  while (diff !== 0 && buckets > 0) {
    const idx = bi % buckets;
    if (diff > 0) {
      if (perBucket[idx] < maxPerBucket) {
        perBucket[idx]++;
        diff--;
      }
    } else {
      if (perBucket[idx] > 0) {
        perBucket[idx]--;
        diff++;
      }
    }
    bi++;
    if (bi > buckets * 2000) break;
  }

  const times: Date[] = [];
  for (let i = 0; i < buckets; i++) {
    const k = perBucket[i] ?? 0;
    const minuteOffset = offsets[i] ?? 0;
    const base = addMinutes(windowStart, minuteOffset);
    for (let j = 0; j < k; j++) {
      const sec = intraSecond(rand, intraBucketJitter);
      times.push(addSeconds(base, sec));
    }
  }

  times.sort((a, b) => a.getTime() - b.getTime());
  if (times.length > count) return times.slice(0, count);
  while (times.length < count) {
    const idx = Math.floor(rand() * offsets.length);
    const base = addMinutes(windowStart, offsets[idx] ?? 0);
    times.push(addSeconds(base, intraSecond(rand, intraBucketJitter)));
    times.sort((a, b) => a.getTime() - b.getTime());
  }
  return times.slice(0, count);
}
