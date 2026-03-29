"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  if (pathname === "/login") {
    return null
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      })
    } finally {
      window.location.assign("/login")
    }
  }

  return (
    <div className="border-b bg-background">

      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">

        <div className="flex items-center gap-6">

          <Link
            href="/"
            prefetch={false}
            className="font-semibold text-lg"
          >
            Memory
          </Link>

          <button
            type="button"
            onClick={() => router.replace("/planner")}
            className="text-sm text-muted-foreground hover:text-black"
          >
            Planner
          </button>

          <Link
            href="/cards"
            prefetch={false}
            className="text-sm text-muted-foreground hover:text-black"
          >
            Cards
          </Link>

          <Link
            href="/study"
            prefetch={false}
            className="text-sm text-muted-foreground hover:text-black"
          >
            Тексты
          </Link>

          <Link
            href="/study"
            prefetch={false}
            className="text-sm text-muted-foreground hover:text-black"
          >
            Учебники 2.0
          </Link>

        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cards/new"
            prefetch={false}
            className="text-sm bg-black text-white px-3 py-1.5 rounded"
          >
            New Card
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-sm rounded border border-border px-3 py-1.5 text-muted-foreground transition hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Выходим..." : "Выйти"}
          </button>
        </div>

      </div>

    </div>
  )
}
