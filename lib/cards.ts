export type Card = {
  id: string
  title: string
  content: string
  source?: string
  type: string
  sphere: string
  tags: string[]
  image?: string | null
}

export const DEFAULT_CARD_SPHERE = "Без сферы"

export function normalizeCard(card: Partial<Card>, index = 0): Card {
  const safeId =
    card?.id && String(card.id).trim() !== ""
      ? String(card.id)
      : `legacy-${index}-${card?.title ?? "card"}`

  return {
    ...card,
    id: safeId,
    title: card?.title ?? "",
    content: card?.content ?? "",
    source: card?.source ?? "",
    type: card?.type ?? "thought",
    sphere:
      card?.sphere && String(card.sphere).trim() !== ""
        ? String(card.sphere).trim()
        : DEFAULT_CARD_SPHERE,
    tags: Array.isArray(card?.tags) ? card.tags : [],
    image: card?.image ?? null,
  }
}

export function normalizeCards(cards: unknown): Card[] {
  return Array.isArray(cards)
    ? cards.map((card, index) => normalizeCard(card as Partial<Card>, index))
    : []
}

export async function getAllCards(): Promise<Card[]> {
  if (typeof window === "undefined") {
    throw new Error("getAllCards can only be called in the browser")
  }

  const response = await fetch("/api/cards", {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to load cards")
  }

  const cards = await response.json()
  return normalizeCards(cards)
}

export async function saveCards(cards: Card[]) {
  if (typeof window === "undefined") {
    throw new Error("saveCards can only be called in the browser")
  }

  const response = await fetch("/api/cards", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cards),
  })

  if (!response.ok) {
    throw new Error("Failed to save cards")
  }
}

export async function createCard(card: Card) {
  if (typeof window === "undefined") {
    throw new Error("createCard can only be called in the browser")
  }

  const response = await fetch("/api/cards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(card),
  })

  if (!response.ok) {
    throw new Error("Failed to create card")
  }
}

export async function updateCard(card: Card) {
  if (typeof window === "undefined") {
    throw new Error("updateCard can only be called in the browser")
  }

  const response = await fetch(`/api/cards/${card.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(card),
  })

  if (!response.ok) {
    throw new Error("Failed to update card")
  }
}

export async function deleteCard(id: string) {
  if (typeof window === "undefined") {
    throw new Error("deleteCard can only be called in the browser")
  }

  const response = await fetch(`/api/cards/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete card")
  }
}

export async function getCard(id: string) {
  if (typeof window === "undefined") {
    throw new Error("getCard can only be called in the browser")
  }

  const response = await fetch(`/api/cards/${id}`, {
    cache: "no-store",
  })

  if (response.status === 404) {
    return undefined
  }

  if (!response.ok) {
    throw new Error("Failed to load card")
  }

  return await response.json()
}
