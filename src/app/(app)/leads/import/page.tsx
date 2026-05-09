import { PageHeader } from "@/components/page-header";

import { CsvImportClient } from "./csv-import-client";

export default function LeadsImportPage() {
  return (
    <>
      <PageHeader
        title="CSV import"
        description="Parse locally, map the email column, validate against suppression and MX, then upsert into master leads."
      />
      <div className="mt-8">
        <CsvImportClient />
      </div>
    </>
  );
}
