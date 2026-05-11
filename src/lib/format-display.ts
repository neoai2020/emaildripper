import { enUS } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

const UTC = "UTC";

/**
 * Formats stored instants for operator-facing tables. Values are shown in UTC;
 * pair column headers with "(UTC)" where it helps.
 */
export function formatUtcDateTime(
  iso: string | null | undefined,
  opts?: { seconds?: boolean },
): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pattern = opts?.seconds ? "MMM d, yyyy · h:mm:ss a" : "MMM d, yyyy · h:mm a";
  return formatInTimeZone(d, UTC, pattern, { locale: enUS });
}

/** Campaign / lead / job status tokens from the database → readable labels. */
export function humanizeStatus(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
