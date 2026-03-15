import { kv } from "@vercel/kv"
import { NextResponse } from "next/server"

const KEY = "cards_db"

export async function GET() {
  const cards = await kv.get(KEY)
  return NextResponse.json(cards ?? [])
}

export async function POST(request: Request) {
  const card = await request.json()

  const cards = (await kv.get<any[]>(KEY)) ?? []

  const updated = [...cards, card]

  await kv.set(KEY, updated)

  return NextResponse.json({ success: true })
}