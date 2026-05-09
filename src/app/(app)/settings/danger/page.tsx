import { PageHeader } from "@/components/page-header";

import { DangerZoneClient } from "./danger-zone-client";

export default function SettingsDangerPage() {
  return (
    <>
      <PageHeader
        title="Danger zone"
        description="Destructive actions require typing the exact confirmation phrase. There is no undo."
      />
      <DangerZoneClient />
    </>
  );
}
