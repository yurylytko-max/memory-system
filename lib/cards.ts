export type Card = {
  id: string
  title: string
  content: string
  contentType?: CardContentType
  checklist?: CardChecklistItem[]
  source?: string
  type: string
  sphere: string
  tags: string[]
  image?: string | null
  workspace: CardWorkspace
}

export type CardContentType = "text" | "checklist"

export type CardChecklistItem = {
  id: string
  text: string
  checked: boolean
}

export type CardWorkspace = "life" | "work" | "study"

export const DEFAULT_CARD_SPHERE = "Без сферы"
export const DEFAULT_CARD_WORKSPACE: CardWorkspace = "life"
export const DEFAULT_CARD_CONTENT_TYPE: CardContentType = "text"

export const CARD_WORKSPACES: CardWorkspace[] = ["life", "work", "study"]

export const CARD_WORKSPACE_META: Record<
  CardWorkspace,
  {
    label: string
    description: string
  }
> = {
  life: {
    label: "жизнь",
    description: "Личная база знаний, существующие карточки по умолчанию находятся здесь.",
  },
  work: {
    label: "работа",
    description: "Отдельное рабочее пространство с полной изоляцией карточек и сфер.",
  },
  study: {
    label: "учёба",
    description: "Изолированное учебное пространство для конспектов, материалов и чек-листов.",
  },
}

export function isCardWorkspace(value: string | null | undefined): value is CardWorkspace {
  return CARD_WORKSPACES.includes(value as CardWorkspace)
}

export function getCardWorkspaceLabel(workspace: CardWorkspace) {
  return CARD_WORKSPACE_META[workspace].label
}

export function isCardContentType(value: string | null | undefined): value is CardContentType {
  return value === "text" || value === "checklist"
}

function normalizeChecklistItem(
  item: Partial<CardChecklistItem>,
  index: number
): CardChecklistItem {
  return {
    id:
      item?.id && String(item.id).trim() !== ""
        ? String(item.id)
        : `checklist-${index}`,
    text: item?.text ? String(item.text) : "",
    checked: Boolean(item?.checked),
  }
}

export function normalizeChecklist(checklist: unknown): CardChecklistItem[] {
  if (!Array.isArray(checklist)) {
    return []
  }

  return checklist
    .map((item, index) =>
      normalizeChecklistItem(item as Partial<CardChecklistItem>, index)
    )
    .filter(item => item.text.trim() !== "")
}

export function normalizeCard(card: Partial<Card>, index = 0): Card {
  const safeId =
    card?.id && String(card.id).trim() !== ""
      ? String(card.id)
      : `legacy-${index}-${card?.title ?? "card"}`

  const checklist = normalizeChecklist(card?.checklist)
  const contentType = isCardContentType(card?.contentType)
    ? card.contentType
    : checklist.length > 0
      ? "checklist"
      : DEFAULT_CARD_CONTENT_TYPE

  return {
    ...card,
    id: safeId,
    title: card?.title ?? "",
    content: card?.content ?? "",
    contentType,
    checklist,
    source: card?.source ?? "",
    type: card?.type ?? "thought",
    sphere:
      card?.sphere && String(card.sphere).trim() !== ""
        ? String(card.sphere).trim()
        : DEFAULT_CARD_SPHERE,
    tags: Array.isArray(card?.tags) ? card.tags : [],
    image: card?.image ?? null,
    workspace: isCardWorkspace(card?.workspace) ? card.workspace : DEFAULT_CARD_WORKSPACE,
  }
}

export function normalizeCards(cards: unknown): Card[] {
  return Array.isArray(cards)
    ? cards.map((card, index) => normalizeCard(card as Partial<Card>, index))
    : []
}

export function getCardContentPreview(card: Pick<Card, "content" | "checklist" | "contentType">) {
  if (card.contentType === "checklist" && card.checklist?.length) {
    return card.checklist.map(item => item.text).join("\n")
  }

  return card.content
}

export function getUniqueCardSpheres(cards: Pick<Card, "sphere">[]): string[] {
  return Array.from(
    new Set(
      cards
        .map(card => card.sphere.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "ru"))
}

export async function getAllCards(workspace?: CardWorkspace): Promise<Card[]> {
  if (typeof window === "undefined") {
    throw new Error("getAllCards can only be called in the browser")
  }

  const query = workspace ? `?workspace=${workspace}` : ""
  const response = await fetch(`/api/cards${query}`, {
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

export async function updateCard(card: Card, workspace?: CardWorkspace) {
  if (typeof window === "undefined") {
    throw new Error("updateCard can only be called in the browser")
  }

  const query = workspace ? `?workspace=${workspace}` : ""
  const response = await fetch(`/api/cards/${card.id}${query}`, {
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

export async function deleteCard(id: string, workspace?: CardWorkspace) {
  if (typeof window === "undefined") {
    throw new Error("deleteCard can only be called in the browser")
  }

  const query = workspace ? `?workspace=${workspace}` : ""
  const response = await fetch(`/api/cards/${id}${query}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete card")
  }
}

export async function getCard(id: string, workspace?: CardWorkspace) {
  if (typeof window === "undefined") {
    throw new Error("getCard can only be called in the browser")
  }

  const query = workspace ? `?workspace=${workspace}` : ""
  const response = await fetch(`/api/cards/${id}${query}`, {
    cache: "no-store",
  })

  if (response.status === 404) {
    return undefined
  }

  if (!response.ok) {
    throw new Error("Failed to load card")
  }

  return normalizeCard(await response.json())
}
