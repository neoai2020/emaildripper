import { AlertTriangle } from "lucide-react";

export function DbBanner() {
  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-100">
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
        <p>
          <span className="font-medium">Supabase is not configured.</span> Add{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="font-mono text-xs">.env.local</code>, run the SQL migration on your
          project, then restart <code className="font-mono text-xs">npm run dev</code>.
        </p>
      </div>
    </div>
  );
}
