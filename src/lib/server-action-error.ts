import { ZodError } from "zod";

const RSC_DIGEST_RE = /Server Components render/i;

/** Turn thrown values into messages safe to show in Sonner toasts (production-friendly). */
export function formatServerActionError(e: unknown): string {
  if (e instanceof ZodError) {
    const first = e.issues[0];
    if (first) return first.message;
    return "Some fields are invalid — check the wizard and try again.";
  }
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
