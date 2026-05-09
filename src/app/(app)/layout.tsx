import { AppShell } from "@/components/layout/app-shell";
import { DbBanner } from "@/components/db-banner";

/** Read Supabase env at request time (DO injects secrets at runtime; avoids stale static shell). */
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return (
    <>
      {!configured ? <DbBanner /> : null}
      <AppShell>{children}</AppShell>
    </>
  );
}
