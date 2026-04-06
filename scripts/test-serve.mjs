import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

async function loadEnvFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const mode = process.argv[2] === "start" ? "start" : "dev";
await loadEnvFile(resolve(process.cwd(), ".env.test"));

const child = spawn(
  process.execPath,
  [
    "./node_modules/next/dist/bin/next",
    mode,
    "-p",
    process.env.PORT ?? "3005",
    "-H",
    "localhost",
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
