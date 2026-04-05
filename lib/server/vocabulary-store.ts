import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "redis";

import { normalizeVocabulary, type VocabularyItem } from "@/lib/vocabulary";

const KEY = "vocabulary_db";
const FALLBACK_VOCABULARY_PATH = join(process.cwd(), ".data", "vocabulary-db.json");

declare global {
  var __vocabularyRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

async function readFallbackVocabulary(): Promise<VocabularyItem[]> {
  try {
    const raw = await readFile(FALLBACK_VOCABULARY_PATH, "utf8");
    const items = normalizeVocabulary(JSON.parse(raw));
    const normalizedRaw = JSON.stringify(items);

    if (raw !== normalizedRaw) {
      await mkdir(dirname(FALLBACK_VOCABULARY_PATH), { recursive: true });
      await writeFile(FALLBACK_VOCABULARY_PATH, normalizedRaw, "utf8");
    }

    return items;
  } catch {
    return [];
  }
}

async function writeFallbackVocabulary(items: VocabularyItem[]) {
  await mkdir(dirname(FALLBACK_VOCABULARY_PATH), { recursive: true });
  await writeFile(
    FALLBACK_VOCABULARY_PATH,
    JSON.stringify(normalizeVocabulary(items)),
    "utf8"
  );
}

async function getClient() {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (!global.__vocabularyRedisClient) {
    global.__vocabularyRedisClient = createClient({ url });
    global.__vocabularyRedisClient.on("error", (error) => {
      console.error("Vocabulary Redis client error:", error);
    });
  }

  if (!global.__vocabularyRedisClient.isOpen) {
    await global.__vocabularyRedisClient.connect();
  }

  return global.__vocabularyRedisClient;
}

export async function readVocabulary(): Promise<VocabularyItem[]> {
  try {
    const client = await getClient();

    if (!client) {
      return await readFallbackVocabulary();
    }

    const raw = await client.get(KEY);

    if (!raw) {
      return [];
    }

    const items = normalizeVocabulary(JSON.parse(raw));
    const normalizedRaw = JSON.stringify(items);

    if (raw !== normalizedRaw) {
      await client.set(KEY, normalizedRaw);
    }

    return items;
  } catch {
    return await readFallbackVocabulary();
  }
}

export async function writeVocabulary(items: VocabularyItem[]) {
  try {
    const client = await getClient();
    const normalized = normalizeVocabulary(items);

    if (!client) {
      await writeFallbackVocabulary(normalized);
      return;
    }

    await client.set(KEY, JSON.stringify(normalized));
  } catch {
    await writeFallbackVocabulary(items);
  }
}
