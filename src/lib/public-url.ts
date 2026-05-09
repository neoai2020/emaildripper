import { headers } from "next/headers";

/** Best-effort absolute origin for cron/docs (falls back to env). */
export function getPublicBaseUrl(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return "";
}
