import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "redis";

import { normalizePlan, type Plan } from "@/lib/plans";

const KEY = "plans_db";
const FALLBACK_PLANS_PATH = join(process.cwd(), ".data", "plans-db.json");

declare global {
  var __plansRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

async function readFallbackPlans(): Promise<Plan[]> {
  try {
    const raw = await readFile(FALLBACK_PLANS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizePlan) : [];
  } catch {
    return [];
  }
}

async function writeFallbackPlans(plans: Plan[]) {
  await mkdir(dirname(FALLBACK_PLANS_PATH), { recursive: true });
  await writeFile(FALLBACK_PLANS_PATH, JSON.stringify(plans), "utf8");
}

async function getClient() {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (!global.__plansRedisClient) {
    global.__plansRedisClient = createClient({ url });
    global.__plansRedisClient.on("error", (error) => {
      console.error("Plans Redis client error:", error);
    });
  }

  if (!global.__plansRedisClient.isOpen) {
    await global.__plansRedisClient.connect();
  }

  return global.__plansRedisClient;
}

export async function readPlans(): Promise<Plan[]> {
  try {
    const client = await getClient();

    if (!client) {
      return await readFallbackPlans();
    }

    const raw = await client.get(KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizePlan) : [];
  } catch {
    return await readFallbackPlans();
  }
}

export async function writePlans(plans: Plan[]) {
  try {
    const client = await getClient();

    if (!client) {
      await writeFallbackPlans(plans);
      return;
    }

    await client.set(KEY, JSON.stringify(plans));
  } catch {
    await writeFallbackPlans(plans);
  }
}
