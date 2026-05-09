import { ComingSoon } from "@/components/coming-soon";

export default function CampaignPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ComingSoon
      title={`Pre-flight preview · ${params.id}`}
      description="Timeline, histogram, first 20 sends — PRD §11."
    />
  );
}
