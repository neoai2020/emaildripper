import { AlertTriangle } from "lucide-react";

export function DbBanner() {
  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-100">
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
        <p>
          <span className="font-medium">The app cannot reach its database yet.</span> Whoever hosts this site needs to
          add the database connection values in the hosting control panel, apply the supplied database setup script,
          and restart the app.
        </p>
      </div>
    </div>
  );
}
