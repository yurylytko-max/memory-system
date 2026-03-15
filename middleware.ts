import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "memory-system-delta.vercel.app";
const DEPLOYMENT_HOST_SUFFIX = "-yurylytko-maxs-projects.vercel.app";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (
    host &&
    host !== CANONICAL_HOST &&
    host.endsWith(DEPLOYMENT_HOST_SUFFIX)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https";
    redirectUrl.host = CANONICAL_HOST;
    return NextResponse.redirect(redirectUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
