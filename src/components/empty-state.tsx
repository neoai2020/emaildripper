import Link from "next/link";

import { cn } from "@/lib/utils";

function InboxIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={cn("mx-auto text-muted-foreground/60", className)}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="12" y="22" width="96" height="60" rx="8" stroke="currentColor" strokeWidth="2" />
      <path d="M12 36h96" stroke="currentColor" strokeWidth="2" />
      <circle cx="40" cy="58" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M54 58h40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 68h28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-14 text-center",
        className
      )}
    >
      <InboxIllustration className="mb-4 h-20 w-28" />
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
