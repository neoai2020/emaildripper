import { PageHeader } from "@/components/page-header";
import { getServiceSupabase } from "@/lib/db";

import { CsvImportClient, type CsvMappingOption } from "./csv-import-client";

export default async function LeadsImportPage() {
  const sb = getServiceSupabase();
  const mappings: CsvMappingOption[] =
    sb != null
      ? ((await sb.from("csv_column_mappings").select("id,name,field_map").order("name")).data ?? []).map(
          (r) => ({
            id: r.id as string,
            name: r.name as string,
            field_map: (r.field_map ?? {}) as Record<string, unknown>,
          })
        )
      : [];

  return (
    <>
      <PageHeader
        title="CSV import"
        description="Upload a spreadsheet, pick the email column, check addresses, then save them to your master list."
      />
      <div className="mt-8">
        <CsvImportClient mappings={mappings} />
      </div>
    </>
  );
}
