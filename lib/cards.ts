import { kv } from "@vercel/kv"

export type Card = {
  id: string
  title: string
  content: string
  source?: string
  type: string
  tags: string[]
  image?: string | null
}

const KEY = "cards_db"

function getLocal(): Card[] {
  if (typeof window === "undefined") return []

  const raw = localStorage.getItem(KEY)

  if (!raw) return []

  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveLocal(cards: Card[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(cards))
}

export async function getAllCards(): Promise<Card[]> {
  if (typeof window !== "undefined") {
    return getLocal()
  }

  const cards = await kv.get<Card[]>(KEY)
  return cards ?? []
}

export async function saveCards(cards: Card[]) {
  if (typeof window !== "undefined") {
    saveLocal(cards)
    return
  }

  await kv.set(KEY, cards)
}

export async function createCard(card: Card) {
  const cards = await getAllCards()
  const updated = [...cards, card]
  await saveCards(updated)
}

export async function updateCard(card: Card) {
  const cards = await getAllCards()

  const updated = cards.map(c =>
    c.id === card.id ? card : c
  )

  await saveCards(updated)
}

export async function deleteCard(id: string) {
  const cards = await getAllCards()

  const updated = cards.filter(c => c.id !== id)

  await saveCards(updated)
}

export async function getCard(id: string) {
  const cards = await getAllCards()
  return cards.find(c => c.id === id)
}