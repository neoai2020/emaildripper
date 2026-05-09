import { PageHeader } from "@/components/page-header";

export function ComingSoon({
  title,
  description = "Scaffold only — implementation lands in later PRD phases.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <p className="font-mono text-xs text-muted-foreground">
        Phase 0 route shell — connect Supabase and GitHub when ready.
      </p>
    </>
  );
}
