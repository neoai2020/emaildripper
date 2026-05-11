export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-xl border border-border/80 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-muted/50" />
      ))}
    </div>
  );
}
