import "server-only"

import { createClient } from "redis"

import type { Card } from "@/lib/cards"

const KEY = "cards_db"

declare global {
  var __cardsRedisClient:
    | ReturnType<typeof createClient>
    | undefined
}

function getRedisUrl() {
  const url = process.env.REDIS_URL

  if (!url) {
    throw new Error("Missing required environment variable REDIS_URL")
  }

  return url
}

async function getClient() {
  if (!global.__cardsRedisClient) {
    global.__cardsRedisClient = createClient({
      url: getRedisUrl(),
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
  const client = await getClient()
  const raw = await client.get(KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function writeCards(cards: Card[]) {
  const client = await getClient()
  await client.set(KEY, JSON.stringify(cards))
}
