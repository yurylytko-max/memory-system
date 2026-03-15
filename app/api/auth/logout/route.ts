import { NextResponse } from "next/server"

import { LOGIN_PATH, SITE_AUTH_COOKIE } from "@/lib/auth"

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url), {
    status: 303,
  })

  response.cookies.set({
    name: SITE_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  })

  return response
}
