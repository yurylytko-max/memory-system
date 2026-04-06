import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createClient } from "redis";

import { normalizeMindPalaces, type MindPalace } from "@/lib/mind-palaces";
import { getDataPath } from "@/lib/server/storage-paths";

const KEY = "mind_palaces_db";
const FALLBACK_MIND_PALACES_PATH = getDataPath("mind-palaces-db.json");

declare global {
  var __mindPalacesRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

async function readFallbackMindPalaces(): Promise<MindPalace[]> {
  try {
    const raw = await readFile(FALLBACK_MIND_PALACES_PATH, "utf8");
    const items = normalizeMindPalaces(JSON.parse(raw));
    const normalizedRaw = JSON.stringify(items);

    if (raw !== normalizedRaw) {
      await mkdir(dirname(FALLBACK_MIND_PALACES_PATH), { recursive: true });
      await writeFile(FALLBACK_MIND_PALACES_PATH, normalizedRaw, "utf8");
    }

    return items;
  } catch {
    return [];
  }
}

async function writeFallbackMindPalaces(items: MindPalace[]) {
  await mkdir(dirname(FALLBACK_MIND_PALACES_PATH), { recursive: true });
  await writeFile(
    FALLBACK_MIND_PALACES_PATH,
    JSON.stringify(normalizeMindPalaces(items)),
    "utf8"
  );
}

async function getClient() {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (!global.__mindPalacesRedisClient) {
    global.__mindPalacesRedisClient = createClient({ url });
    global.__mindPalacesRedisClient.on("error", (error) => {
      console.error("Mind palaces Redis client error:", error);
    });
  }

  if (!global.__mindPalacesRedisClient.isOpen) {
    await global.__mindPalacesRedisClient.connect();
  }

  return global.__mindPalacesRedisClient;
}

export async function readMindPalaces(): Promise<MindPalace[]> {
  try {
    const client = await getClient();

    if (!client) {
      return await readFallbackMindPalaces();
    }

    const raw = await client.get(KEY);

    if (!raw) {
      return [];
    }

    const items = normalizeMindPalaces(JSON.parse(raw));
    const normalizedRaw = JSON.stringify(items);

    if (raw !== normalizedRaw) {
      await client.set(KEY, normalizedRaw);
    }

    return items;
  } catch {
    return await readFallbackMindPalaces();
  }
}

export async function writeMindPalaces(items: MindPalace[]) {
  try {
    const client = await getClient();
    const normalized = normalizeMindPalaces(items);

    if (!client) {
      await writeFallbackMindPalaces(normalized);
      return;
    }

    await client.set(KEY, JSON.stringify(normalized));
  } catch {
    await writeFallbackMindPalaces(items);
  }
}
