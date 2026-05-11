import { runTick } from "@/lib/tick/runTick";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  return runTick(req);
}

export const POST = GET;
