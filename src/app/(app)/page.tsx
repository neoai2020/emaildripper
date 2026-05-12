import { DashboardClient } from "@/app/(app)/dashboard-client";
import { getDashboardSnapshotAction } from "@/app/(app)/dashboard-actions";
import { PageHeader } from "@/components/page-header";
import { getServiceSupabase } from "@/lib/db";
import { UNCONFIGURED_APP } from "@/lib/user-facing-copy";

export default async function DashboardPage() {
  const sb = getServiceSupabase();
  if (!sb) {
    return (
      <>
        <PageHeader title="Dashboard" description={UNCONFIGURED_APP} />
      </>
    );
  }

  const initial = await getDashboardSnapshotAction();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Dashboard"
          description="Live operational snapshot. Refreshes every 30 seconds while this page stays open."
        />
      </div>
      <DashboardClient initial={initial} />
    </>
  );
}
