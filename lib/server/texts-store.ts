import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "redis";

import type { TextDocument } from "@/lib/texts";

const KEY = "texts_db";
const FALLBACK_TEXTS_PATH = join(process.cwd(), ".data", "texts-db.json");

declare global {
  var __textsRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

async function readFallbackTexts(): Promise<TextDocument[]> {
  try {
    const raw = await readFile(FALLBACK_TEXTS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFallbackTexts(texts: TextDocument[]) {
  await mkdir(dirname(FALLBACK_TEXTS_PATH), { recursive: true });
  await writeFile(FALLBACK_TEXTS_PATH, JSON.stringify(texts), "utf8");
}

async function getClient() {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (!global.__textsRedisClient) {
    global.__textsRedisClient = createClient({ url });
    global.__textsRedisClient.on("error", (error) => {
      console.error("Texts Redis client error:", error);
    });
  }

  if (!global.__textsRedisClient.isOpen) {
    await global.__textsRedisClient.connect();
  }

  return global.__textsRedisClient;
}

export async function readTexts(): Promise<TextDocument[]> {
  try {
    const client = await getClient();

    if (!client) {
      return await readFallbackTexts();
    }

    const raw = await client.get(KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return await readFallbackTexts();
  }
}

export async function writeTexts(texts: TextDocument[]) {
  try {
    const client = await getClient();

    if (!client) {
      await writeFallbackTexts(texts);
      return;
    }

    await client.set(KEY, JSON.stringify(texts));
  } catch {
    await writeFallbackTexts(texts);
  }
}
