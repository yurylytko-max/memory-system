import "server-only"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { BlobNotFoundError, head, put } from "@vercel/blob"
import { createClient } from "redis"

import { normalizeCards, type Card } from "@/lib/cards"

const KEY = "cards_db"
const BLOB_PATH = "cards-db.json"
const FALLBACK_CARDS_PATH = join(
  process.env.VERCEL ? "/tmp" : process.cwd(),
  ".data",
  "cards-db.json"
)

declare global {
  var __cardsRedisClient:
    | ReturnType<typeof createClient>
    | undefined
}

function getRedisUrl() {
  return process.env.REDIS_URL
}

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN
}

function canUseFileFallback() {
  return !getRedisUrl() && !getBlobToken()
}

function toStorageError(action: "read" | "write", error: unknown) {
  const cause = error instanceof Error ? error.message : String(error)
  return new Error(`Cards storage ${action} failed: ${cause}`)
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

async function readBlobCards(): Promise<Card[] | null> {
  const token = getBlobToken()

  if (!token) {
    return null
  }

  try {
    const blob = await head(BLOB_PATH, { token })
    const response = await fetch(blob.url, { cache: "no-store" })

    if (!response.ok) {
      throw new Error(`Blob fetch failed with status ${response.status}`)
    }

    const cards = normalizeCards(await response.json())
    return cards
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return null
    }

    throw error
  }
}

async function writeBlobCards(cards: Card[]) {
  const token = getBlobToken()

  if (!token) {
    return false
  }

  await put(BLOB_PATH, JSON.stringify(normalizeCards(cards)), {
    token,
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  })

  return true
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
    const blobCards = await readBlobCards()

    if (blobCards) {
      return blobCards
    }

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
  } catch (error) {
    if (canUseFileFallback()) {
      return await readFallbackCards()
    }

    throw toStorageError("read", error)
  }
}

export async function writeCards(cards: Card[]) {
  const normalizedCards = normalizeCards(cards)

  try {
    if (await writeBlobCards(normalizedCards)) {
      return
    }

    const client = await getClient()

    if (!client) {
      await writeFallbackCards(normalizedCards)
      return
    }

    await client.set(KEY, JSON.stringify(normalizedCards))
  } catch (error) {
    if (canUseFileFallback()) {
      await writeFallbackCards(normalizedCards)
      return
    }

    throw toStorageError("write", error)
  }
}
