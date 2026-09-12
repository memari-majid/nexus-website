import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Canonical host is apex. www currently also 200s — collapse it to avoid duplicate URLs. */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host.toLowerCase().startsWith("www.")) {
    const url = req.nextUrl.clone();
    url.host = host.replace(/^www\./i, "");
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
