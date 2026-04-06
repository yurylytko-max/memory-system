import { NextResponse } from "next/server"

import {
  createSiteAuthToken,
  isSitePasswordProtectionEnabled,
  isValidSitePassword,
  LOGIN_PATH,
  SITE_AUTH_COOKIE,
} from "@/lib/auth"

function getSafeRedirectPath(nextValue: FormDataEntryValue | null) {
  const nextPath = typeof nextValue === "string" ? nextValue : "/"

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/"
  }

  return nextPath
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const password = typeof formData.get("password") === "string"
    ? String(formData.get("password"))
    : ""
  const nextPath = getSafeRedirectPath(formData.get("next"))
  const requestUrl = new URL(request.url)
  const shouldUseSecureCookie =
    process.env.NODE_ENV === "production" &&
    process.env.E2E_TEST_MODE !== "1" &&
    requestUrl.protocol === "https:"

  if (!isSitePasswordProtectionEnabled()) {
    return NextResponse.redirect(new URL(nextPath, requestUrl), {
      status: 303,
    })
  }

  const isValid = await isValidSitePassword(password)

  if (!isValid) {
    const loginUrl = new URL(LOGIN_PATH, requestUrl)
    loginUrl.searchParams.set("error", "1")

    if (nextPath !== "/") {
      loginUrl.searchParams.set("next", nextPath)
    }

    return NextResponse.redirect(loginUrl, { status: 303 })
  }

  const response = NextResponse.redirect(new URL(nextPath, requestUrl), {
    status: 303,
  })

  response.cookies.set({
    name: SITE_AUTH_COOKIE,
    value: await createSiteAuthToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
