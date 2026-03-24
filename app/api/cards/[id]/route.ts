import { NextResponse } from "next/server"

import { normalizeCard, type Card } from "@/lib/cards"
import { readCards, writeCards } from "@/lib/server/cards-store"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const cards = await readCards()
  const card = cards.find(item => item.id === id)

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 })
  }

  return NextResponse.json(card)
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const card = normalizeCard((await request.json()) as Card)
  const cards = await readCards()

  const existingIndex = cards.findIndex(item => item.id === id)

  if (existingIndex === -1) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 })
  }

  const updated = [...cards]
  updated[existingIndex] = card

  await writeCards(updated)

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const cards = await readCards()
  const updated = cards.filter(card => card.id !== id)

  await writeCards(updated)

  return NextResponse.json({ success: true })
}
