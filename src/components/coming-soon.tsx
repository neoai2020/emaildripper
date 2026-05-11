import { PageHeader } from "@/components/page-header";

export function ComingSoon({
  title,
  description = "This screen is not wired up yet.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <p className="text-xs text-muted-foreground">Check back after the next release, or ask your developer for a timeline.</p>
    </>
  );
}
