import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import {
  hasValidSiteAuthCookie,
  LOGIN_PATH,
  SITE_AUTH_COOKIE,
} from "@/lib/auth"

const PUBLIC_FILE = /\.(.*)$/
const CANONICAL_HOST = "memory-system-delta.vercel.app"
const DEPLOYMENT_HOST_SUFFIX = "-yurylytko-maxs-projects.vercel.app"

function isPublicPath(pathname: string) {
  return (
    pathname === LOGIN_PATH ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname)
  )
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get("host") ?? ""

  if (
    host &&
    host !== CANONICAL_HOST &&
    host.endsWith(DEPLOYMENT_HOST_SUFFIX)
  ) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.protocol = "https"
    redirectUrl.host = CANONICAL_HOST
    return NextResponse.redirect(redirectUrl, 307)
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(SITE_AUTH_COOKIE)?.value
  const isAuthenticated = await hasValidSiteAuthCookie(sessionCookie)

  if (isAuthenticated) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = LOGIN_PATH
  loginUrl.searchParams.set("next", `${pathname}${search}`)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: "/:path*",
}
