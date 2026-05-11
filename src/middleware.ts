import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const reqLike = new Request(request.url, { headers: request.headers });
  const ip = clientIpFromRequest(reqLike);

  if (pathname === "/api/tick") {
    const { ok, retryAfterMs } = checkRateLimit(`mw:tick:${ip}`, 5, 60_000);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limit" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }
    return NextResponse.next();
  }

  const { ok, retryAfterMs } = checkRateLimit(`mw:api:${ip}`, 100, 60_000);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limit" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
