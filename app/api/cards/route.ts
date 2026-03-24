import { NextResponse } from "next/server"

import { normalizeCard, normalizeCards, type Card } from "@/lib/cards"
import { readCards, writeCards } from "@/lib/server/cards-store"

export async function GET() {
  const cards = await readCards()
  return NextResponse.json(cards)
}

export async function POST(request: Request) {
  const card = normalizeCard((await request.json()) as Card)
  const cards = await readCards()

  const updated = [...cards, card]

  await writeCards(updated)

  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const cards = normalizeCards((await request.json()) as Card[])

  await writeCards(cards)

  return NextResponse.json({ success: true })
}
