import { ListSkeleton } from "@/components/list-skeleton";

export default function CampaignsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-10 max-w-md animate-pulse rounded-md bg-muted" />
      <ListSkeleton rows={8} />
    </div>
  );
}
