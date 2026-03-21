import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "redis";

import type { StudyTextbook } from "@/lib/study";
import { normalizeStudyTextbook } from "@/lib/study";

const KEY = "study_db";
const FALLBACK_STUDY_PATH = join(process.cwd(), ".data", "study-db.json");

declare global {
  var __studyRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

async function readFallbackStudy(): Promise<StudyTextbook[]> {
  try {
    const raw = await readFile(FALLBACK_STUDY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeStudyTextbook) : [];
  } catch {
    return [];
  }
}

async function writeFallbackStudy(textbooks: StudyTextbook[]) {
  await mkdir(dirname(FALLBACK_STUDY_PATH), { recursive: true });
  await writeFile(FALLBACK_STUDY_PATH, JSON.stringify(textbooks), "utf8");
}

async function getClient() {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (!global.__studyRedisClient) {
    global.__studyRedisClient = createClient({ url });
    global.__studyRedisClient.on("error", (error) => {
      console.error("Study Redis client error:", error);
    });
  }

  if (!global.__studyRedisClient.isOpen) {
    await global.__studyRedisClient.connect();
  }

  return global.__studyRedisClient;
}

export async function readStudyTextbooks(): Promise<StudyTextbook[]> {
  try {
    const client = await getClient();

    if (!client) {
      return await readFallbackStudy();
    }

    const raw = await client.get(KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeStudyTextbook) : [];
  } catch {
    return await readFallbackStudy();
  }
}

export async function writeStudyTextbooks(textbooks: StudyTextbook[]) {
  try {
    const client = await getClient();

    if (!client) {
      await writeFallbackStudy(textbooks);
      return;
    }

    await client.set(KEY, JSON.stringify(textbooks));
  } catch {
    await writeFallbackStudy(textbooks);
  }
}
