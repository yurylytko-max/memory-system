import "server-only"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { createClient } from "redis"

import { normalizeCards, type Card } from "@/lib/cards"

const KEY = "cards_db"
const FALLBACK_CARDS_PATH = join(process.cwd(), ".data", "cards-db.json")

declare global {
  var __cardsRedisClient:
    | ReturnType<typeof createClient>
    | undefined
}

function getRedisUrl() {
  return process.env.REDIS_URL
}

async function readFallbackCards(): Promise<Card[]> {
  try {
    const raw = await readFile(FALLBACK_CARDS_PATH, "utf8")
    const cards = normalizeCards(JSON.parse(raw))
    const normalizedRaw = JSON.stringify(cards)

    if (raw !== normalizedRaw) {
      await mkdir(dirname(FALLBACK_CARDS_PATH), { recursive: true })
      await writeFile(FALLBACK_CARDS_PATH, normalizedRaw, "utf8")
    }

    return cards
  } catch {
    return []
  }
}

async function writeFallbackCards(cards: Card[]) {
  await mkdir(dirname(FALLBACK_CARDS_PATH), { recursive: true })
  await writeFile(FALLBACK_CARDS_PATH, JSON.stringify(normalizeCards(cards)), "utf8")
}

async function getClient() {
  const url = getRedisUrl()

  if (!url) {
    return null
  }

  if (!global.__cardsRedisClient) {
    global.__cardsRedisClient = createClient({
      url,
    })

    global.__cardsRedisClient.on("error", error => {
      console.error("Redis client error:", error)
    })
  }

  if (!global.__cardsRedisClient.isOpen) {
    await global.__cardsRedisClient.connect()
  }

  return global.__cardsRedisClient
}

export async function readCards(): Promise<Card[]> {
  try {
    const client = await getClient()

    if (!client) {
      return await readFallbackCards()
    }

    const raw = await client.get(KEY)

    if (!raw) {
      return []
    }

    const cards = normalizeCards(JSON.parse(raw))
    const normalizedRaw = JSON.stringify(cards)

    if (raw !== normalizedRaw) {
      await client.set(KEY, normalizedRaw)
    }

    return cards
  } catch {
    return await readFallbackCards()
  }
}

export async function writeCards(cards: Card[]) {
  try {
    const client = await getClient()
    const normalizedCards = normalizeCards(cards)

    if (!client) {
      await writeFallbackCards(normalizedCards)
      return
    }

    await client.set(KEY, JSON.stringify(normalizedCards))
  } catch {
    await writeFallbackCards(cards)
  }
}
