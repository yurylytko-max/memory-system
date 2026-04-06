import { NextResponse } from "next/server"

import { LOGIN_PATH, SITE_AUTH_COOKIE } from "@/lib/auth"

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const shouldUseSecureCookie =
    process.env.NODE_ENV === "production" &&
    process.env.E2E_TEST_MODE !== "1" &&
    requestUrl.protocol === "https:"
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url), {
    status: 303,
  })

  response.cookies.set({
    name: SITE_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie,
    path: "/",
    expires: new Date(0),
  })

  return response
}
