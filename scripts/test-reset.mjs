import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const testDataRoot = resolve(process.cwd(), process.env.TEST_DATA_ROOT ?? ".test-data");

await rm(testDataRoot, { recursive: true, force: true });
await mkdir(testDataRoot, { recursive: true });
