import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createClient } from "redis";

import {
  addCompletedPlannerTask,
  getCompletedTaskKey,
  normalizeCompletedPlannerTask,
  type CompletedPlannerTask,
} from "@/lib/planner-completed-tasks";
import { getDataPath } from "@/lib/server/storage-paths";

const LEGACY_KEY = "planner_completed_tasks_db";
const HASH_KEY = "planner_completed_tasks_db:items";
const FALLBACK_COMPLETED_TASKS_PATH = getDataPath(
  "planner-completed-tasks-db.json"
);

declare global {
  var __plannerCompletedTasksRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

async function readFallbackCompletedTasks(): Promise<CompletedPlannerTask[]> {
  try {
    const raw = await readFile(FALLBACK_COMPLETED_TASKS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeCompletedPlannerTask) : [];
  } catch {
    return [];
  }
}

async function writeFallbackCompletedTasks(tasks: CompletedPlannerTask[]) {
  await mkdir(dirname(FALLBACK_COMPLETED_TASKS_PATH), { recursive: true });
  await writeFile(
    FALLBACK_COMPLETED_TASKS_PATH,
    JSON.stringify(tasks.map(normalizeCompletedPlannerTask), null, 2),
    "utf8"
  );
}

function parseCompletedPlannerTasks(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(normalizeCompletedPlannerTask) : [];
  } catch {
    return [];
  }
}

function mergeCompletedPlannerTaskLists(
  ...taskLists: CompletedPlannerTask[][]
) {
  let mergedTasks: CompletedPlannerTask[] = [];

  for (const taskList of taskLists) {
    for (const task of taskList) {
      mergedTasks = addCompletedPlannerTask(mergedTasks, task);
    }
  }

  return mergedTasks;
}

async function getClient() {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (!global.__plannerCompletedTasksRedisClient) {
    global.__plannerCompletedTasksRedisClient = createClient({ url });
    global.__plannerCompletedTasksRedisClient.on("error", (error) => {
      console.error("Planner completed tasks Redis client error:", error);
    });
  }

  if (!global.__plannerCompletedTasksRedisClient.isOpen) {
    await global.__plannerCompletedTasksRedisClient.connect();
  }

  return global.__plannerCompletedTasksRedisClient;
}

export async function readCompletedPlannerTasks(): Promise<CompletedPlannerTask[]> {
  try {
    const client = await getClient();

    if (!client) {
      return await readFallbackCompletedTasks();
    }

    const [legacyRaw, hashValues] = await Promise.all([
      client.get(LEGACY_KEY),
      client.sendCommand(["HVALS", HASH_KEY]),
    ]);
    const legacyTasks = parseCompletedPlannerTasks(legacyRaw);
    const hashTasks = ((hashValues as unknown[]) ?? []).flatMap((value) =>
      parseCompletedPlannerTasks(`[${String(value)}]`)
    );

    return mergeCompletedPlannerTaskLists(legacyTasks, hashTasks);
  } catch {
    return await readFallbackCompletedTasks();
  }
}

export async function writeCompletedPlannerTasks(tasks: CompletedPlannerTask[]) {
  const normalizedTasks = tasks.map(normalizeCompletedPlannerTask);

  try {
    const client = await getClient();

    if (!client) {
      await writeFallbackCompletedTasks(normalizedTasks);
      return;
    }

    await appendCompletedPlannerTasks(normalizedTasks);
  } catch {
    await writeFallbackCompletedTasks(normalizedTasks);
  }
}

async function migrateLegacyCompletedTasksToHash(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>
) {
  const legacyTasks = parseCompletedPlannerTasks(await client.get(LEGACY_KEY));

  for (const task of legacyTasks) {
    await client.sendCommand([
      "HSETNX",
      HASH_KEY,
      getCompletedTaskKey(task),
      JSON.stringify(normalizeCompletedPlannerTask(task)),
    ]);
  }
}

export async function appendCompletedPlannerTasks(
  tasks: CompletedPlannerTask[]
) {
  const normalizedTasks = tasks.map(normalizeCompletedPlannerTask);

  try {
    const client = await getClient();

    if (!client) {
      const currentTasks = await readFallbackCompletedTasks();
      const currentUniqueTasks = mergeCompletedPlannerTaskLists(currentTasks);
      const updatedTasks = mergeCompletedPlannerTaskLists(
        currentUniqueTasks,
        normalizedTasks
      );

      await writeFallbackCompletedTasks(updatedTasks);
      return updatedTasks.length - currentUniqueTasks.length;
    }

    await migrateLegacyCompletedTasksToHash(client);

    let addedCount = 0;

    for (const task of normalizedTasks) {
      const result = await client.sendCommand([
        "HSETNX",
        HASH_KEY,
        getCompletedTaskKey(task),
        JSON.stringify(task),
      ]);

      if (Number(result) === 1) {
        addedCount += 1;
      }
    }

    return addedCount;
  } catch {
    const currentTasks = await readFallbackCompletedTasks();
    const currentUniqueTasks = mergeCompletedPlannerTaskLists(currentTasks);
    const updatedTasks = mergeCompletedPlannerTaskLists(
      currentUniqueTasks,
      normalizedTasks
    );

    await writeFallbackCompletedTasks(updatedTasks);
    return updatedTasks.length - currentUniqueTasks.length;
  }
}

export async function appendCompletedPlannerTask(task: CompletedPlannerTask) {
  return appendCompletedPlannerTasks([task]);
}
