const RSC_DIGEST_RE = /Server Components render/i;

function zodFirstMessage(e: unknown): string | null {
  if (!e || typeof e !== "object" || !("issues" in e)) return null;
  const issues = (e as { issues?: { message?: string }[] }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return null;
  return issues[0]?.message ?? null;
}

/** Turn thrown values into messages safe to show in Sonner toasts (production-friendly). */
export function formatServerActionError(e: unknown): string {
  const zodMsg = zodFirstMessage(e);
  if (zodMsg) return zodMsg;
  if (e instanceof Error) {
    if (RSC_DIGEST_RE.test(e.message)) {
      return (
        "The server hit an internal render error (often after saving). " +
        "Open Campaigns — your preview may already exist. If not, try a smaller lead cap or check DigitalOcean runtime logs."
      );
    }
    return e.message;
  }
  return "Something went wrong. Try again or check server logs.";
}
