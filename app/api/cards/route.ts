import { NextResponse } from "next/server"

import type { Card } from "@/lib/cards"
import { readCards, writeCards } from "@/lib/server/cards-store"

export async function GET() {
  const cards = await readCards()
  return NextResponse.json(cards)
}

export async function POST(request: Request) {
  const card = (await request.json()) as Card
  const cards = await readCards()

  const updated = [...cards, card]

  await writeCards(updated)

  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const cards = (await request.json()) as Card[]

  await writeCards(Array.isArray(cards) ? cards : [])

  return NextResponse.json({ success: true })
}
