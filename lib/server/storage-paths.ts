import "server-only";

import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

function trimEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function isTestStorageMode() {
  return trimEnv("E2E_TEST_MODE") === "1" || trimEnv("NODE_ENV") === "test";
}

function resolveRoot(root: string) {
  if (!root) {
    return "";
  }

  return isAbsolute(root) ? root : join(process.cwd(), root);
}

export function getDataRoot() {
  const explicitTestRoot = resolveRoot(trimEnv("TEST_DATA_ROOT"));

  if (isTestStorageMode() && explicitTestRoot) {
    return explicitTestRoot;
  }

  if (process.env.VERCEL) {
    return join(tmpdir(), "memory-system", ".data");
  }

  return join(process.cwd(), ".data");
}

export function getDataPath(...segments: string[]) {
  return join(getDataRoot(), ...segments);
}
