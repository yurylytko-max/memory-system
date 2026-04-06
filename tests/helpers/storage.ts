import { mkdir, rm } from "node:fs/promises";

import { TEST_DATA_ROOT } from "./env";

export async function ensureTestDataRoot() {
  await mkdir(TEST_DATA_ROOT, { recursive: true });
}

export async function resetTestData() {
  await rm(TEST_DATA_ROOT, { recursive: true, force: true });
  await ensureTestDataRoot();
}
