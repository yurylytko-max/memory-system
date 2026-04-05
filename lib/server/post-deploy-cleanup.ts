import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createClient } from "redis";

const CLEANUP_KEY_PREFIX = "maintenance:cleanup:study2";
const MARKERS_DIR = join(tmpdir(), "memory-system", ".data", "maintenance");
const LEGACY_STUDY_DIRS = [
  join(process.cwd(), ".data", "study"),
  join(tmpdir(), "memory-system", ".data", "study"),
];

declare global {
  var __postDeployCleanupPromise: Promise<void> | undefined;
  var __postDeployCleanupRedisClient:
    | ReturnType<typeof createClient>
    | undefined;
}

function getDeploymentMarker() {
  return (
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    "local"
  );
}

function getMarkerFilePath(marker: string) {
  return join(MARKERS_DIR, `${marker}.json`);
}

async function getRedisClient() {
  const url = process.env.REDIS_URL?.trim();

  if (!url) {
    return null;
  }

  if (!global.__postDeployCleanupRedisClient) {
    global.__postDeployCleanupRedisClient = createClient({ url });
    global.__postDeployCleanupRedisClient.on("error", (error) => {
      console.error("Post-deploy cleanup Redis error:", error);
    });
  }

  if (!global.__postDeployCleanupRedisClient.isOpen) {
    await global.__postDeployCleanupRedisClient.connect();
  }

  return global.__postDeployCleanupRedisClient;
}

async function claimCleanupRun(marker: string) {
  try {
    const client = await getRedisClient();

    if (client) {
      const result = await client.set(
        `${CLEANUP_KEY_PREFIX}:${marker}`,
        new Date().toISOString(),
        {
          NX: true,
        }
      );

      return result === "OK";
    }
  } catch (error) {
    console.error("Failed to claim cleanup in Redis:", error);
  }

  const markerFilePath = getMarkerFilePath(marker);

  try {
    const existing = await readFile(markerFilePath, "utf8");
    return existing.trim().length === 0;
  } catch {
    await mkdir(dirname(markerFilePath), { recursive: true });
    await writeFile(markerFilePath, new Date().toISOString(), "utf8");
    return true;
  }
}

async function removeLegacyStudyData() {
  await Promise.all(
    LEGACY_STUDY_DIRS.map(async (path) => {
      try {
        await rm(path, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to remove legacy study dir: ${path}`, error);
      }
    })
  );
}

async function runCleanupOnce() {
  const marker = getDeploymentMarker();
  const claimed = await claimCleanupRun(marker);

  if (!claimed) {
    return;
  }

  await removeLegacyStudyData();
}

export async function runPostDeployCleanup() {
  if (!global.__postDeployCleanupPromise) {
    global.__postDeployCleanupPromise = runCleanupOnce().catch((error) => {
      console.error("Post-deploy cleanup failed:", error);
    });
  }

  await global.__postDeployCleanupPromise;
}
