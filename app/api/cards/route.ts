import { NextResponse } from "next/server"

import { normalizeCard, normalizeCards, type Card } from "@/lib/cards"
import { readCards, writeCards } from "@/lib/server/cards-store"

export async function GET() {
  try {
    const cards = await readCards()
    return NextResponse.json(cards)
  } catch (error) {
    console.error("GET /api/cards failed:", error)
    return NextResponse.json(
      { error: "Cards storage unavailable" },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const card = normalizeCard((await request.json()) as Card)
    const cards = await readCards()
    const updated = [...cards, card]

    await writeCards(updated)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/cards failed:", error)
    return NextResponse.json(
      { error: "Cards storage unavailable" },
      { status: 503 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const cards = normalizeCards((await request.json()) as Card[])

    await writeCards(cards)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/cards failed:", error)
    return NextResponse.json(
      { error: "Cards storage unavailable" },
      { status: 503 }
    )
  }
}
