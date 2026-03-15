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
  
  export function getAllCards(): Card[] {
    if (typeof window === "undefined") return []
  
    const raw = localStorage.getItem(KEY)
  
    if (!raw) return []
  
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  
  export function saveCards(cards: Card[]) {
    localStorage.setItem(KEY, JSON.stringify(cards))
  }
  
  export function createCard(card: Card) {
    const cards = getAllCards()
  
    const updated = [...cards, card]
  
    saveCards(updated)
  }
  
  export function updateCard(card: Card) {
    const cards = getAllCards()
  
    const updated = cards.map(c =>
      c.id === card.id ? card : c
    )
  
    saveCards(updated)
  }
  
  export function deleteCard(id: string) {
    const cards = getAllCards()
  
    const updated = cards.filter(c => c.id !== id)
  
    saveCards(updated)
  }
  
  export function getCard(id: string) {
    const cards = getAllCards()
  
    return cards.find(c => c.id === id)
  }