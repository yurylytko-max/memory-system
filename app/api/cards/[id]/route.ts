import { NextResponse } from "next/server"

import {
  isCardWorkspace,
  normalizeCard,
  type Card,
} from "@/lib/cards"
import { readCards, writeCards } from "@/lib/server/cards-store"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(_request.url)
    const workspaceParam = searchParams.get("workspace")
    const cards = await readCards()
    const card = cards.find(item => item.id === id)

    if (
      !card ||
      (isCardWorkspace(workspaceParam) && card.workspace !== workspaceParam)
    ) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    return NextResponse.json(card)
  } catch (error) {
    console.error("GET /api/cards/[id] failed:", error)
    return NextResponse.json(
      { error: "Cards storage unavailable" },
      { status: 503 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const workspaceParam = searchParams.get("workspace")
    const card = normalizeCard((await request.json()) as Card)
    const cards = await readCards()

    const existingIndex = cards.findIndex(item => item.id === id)

    if (
      existingIndex === -1 ||
      (isCardWorkspace(workspaceParam) &&
        cards[existingIndex].workspace !== workspaceParam)
    ) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const updated = [...cards]
    updated[existingIndex] = card

    await writeCards(updated)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/cards/[id] failed:", error)
    return NextResponse.json(
      { error: "Cards storage unavailable" },
      { status: 503 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(_request.url)
    const workspaceParam = searchParams.get("workspace")
    const cards = await readCards()
    const updated = cards.filter(card => {
      if (card.id !== id) {
        return true
      }

      if (isCardWorkspace(workspaceParam) && card.workspace !== workspaceParam) {
        return true
      }

      return false
    })

    if (updated.length === cards.length) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    await writeCards(updated)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/cards/[id] failed:", error)
    return NextResponse.json(
      { error: "Cards storage unavailable" },
      { status: 503 }
    )
  }
}
