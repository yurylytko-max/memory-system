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

  if (!isSitePasswordProtectionEnabled()) {
    return NextResponse.redirect(new URL(nextPath, requestUrl))
  }

  const isValid = await isValidSitePassword(password)

  if (!isValid) {
    const loginUrl = new URL(LOGIN_PATH, requestUrl)
    loginUrl.searchParams.set("error", "1")

    if (nextPath !== "/") {
      loginUrl.searchParams.set("next", nextPath)
    }

    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.redirect(new URL(nextPath, requestUrl))

  response.cookies.set({
    name: SITE_AUTH_COOKIE,
    value: await createSiteAuthToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
