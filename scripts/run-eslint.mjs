import { execFileSync, spawnSync } from "node:child_process";

const ROOT_PATTERNS = ["app", "components", "hooks", "lib"];
const ROOT_FILES = ["eslint.config.mjs", "next.config.ts", "proxy.ts"];
const FILE_GLOBS = ["*.ts", "*.tsx", "*.js", "*.mjs"];
const BATCH_SIZE = 50;

function getFileList() {
  const args = ["--files"];

  for (const root of ROOT_PATTERNS) {
    args.push(root);
  }

  for (const glob of FILE_GLOBS) {
    args.push("-g", glob);
  }

  const output = execFileSync("rg", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  const discovered = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return [...ROOT_FILES, ...discovered].filter(
    (file, index, collection) => collection.indexOf(file) === index
  );
}

function runEslint(files, extraArgs) {
  const result = spawnSync(
    "npx",
    ["eslint", ...extraArgs, ...files],
    {
      cwd: process.cwd(),
      stdio: "inherit",
    }
  );

  return result.status ?? 1;
}

function main() {
  const extraArgs = process.argv.slice(2);
  const files = getFileList();

  if (files.length === 0) {
    console.log("No files matched for lint.");
    return;
  }

  let exitCode = 0;

  for (let index = 0; index < files.length; index += BATCH_SIZE) {
    const batch = files.slice(index, index + BATCH_SIZE);
    const status = runEslint(batch, extraArgs);

    if (status !== 0) {
      exitCode = status;
    }
  }

  process.exit(exitCode);
}

main();
