import { AppSettingsProvider } from "@/components/app-settings-provider";
import { AppShell } from "@/components/layout/app-shell";
import { DbBanner } from "@/components/db-banner";
import { getSettings } from "@/lib/settings";

/** Read Supabase env at request time (DO injects secrets at runtime; avoids stale static shell). */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const settings = configured ? await getSettings() : null;
  const tooltipsEnabled = settings?.tooltips_enabled !== false;

  return (
    <>
      {!configured ? <DbBanner /> : null}
      <AppSettingsProvider tooltipsEnabled={tooltipsEnabled}>
        <AppShell>{children}</AppShell>
      </AppSettingsProvider>
    </>
  );
}
