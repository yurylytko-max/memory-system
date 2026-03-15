"use client"

import Link from "next/link"

export default function TopNav() {
  return (
    <div className="border-b bg-background">

      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">

        <div className="flex items-center gap-6">

          <Link
            href="/"
            className="font-semibold text-lg"
          >
            Memory
          </Link>

          <Link
            href="/planner"
            className="text-sm text-muted-foreground hover:text-black"
          >
            Planner
          </Link>

          <Link
            href="/cards"
            className="text-sm text-muted-foreground hover:text-black"
          >
            Cards
          </Link>

          <Link
            href="/editor"
            className="text-sm text-muted-foreground hover:text-black"
          >
            Writing
          </Link>

        </div>

        <div className="flex items-center gap-3">

          <Link
            href="/cards/new"
            className="text-sm bg-black text-white px-3 py-1.5 rounded"
          >
            New Card
          </Link>

        </div>

      </div>

    </div>
  )
}