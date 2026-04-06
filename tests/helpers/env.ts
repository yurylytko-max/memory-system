import { resolve } from "node:path";

export const TEST_PASSWORD = process.env.SITE_PASSWORD ?? "test-password";
export const TEST_PORT = Number(process.env.PORT ?? 3005);
export const TEST_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${TEST_PORT}`;
export const TEST_DATA_ROOT = resolve(
  process.cwd(),
  process.env.TEST_DATA_ROOT ?? ".test-data"
);

export function isCi() {
  return process.env.CI === "true";
}
