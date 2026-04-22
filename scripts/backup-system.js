const fs = require("node:fs/promises");
const { createWriteStream } = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const net = require("node:net");
const tls = require("node:tls");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ENV_PATH = process.env.PROD_ENV_PATH || "/tmp/memory-system-prod.env";
const BACKUP_ROOT = path.join(PROJECT_ROOT, "backups", "system");
const SITE_URL = "https://memory-system-delta.vercel.app";
const FETCH_TIMEOUT_MS = 20000;

function log(message) {
  console.error(`[backup-system] ${message}`);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeName(value) {
  return Buffer.from(value).toString("base64url");
}

function parseEnv(raw) {
  const env = {};

  for (const line of raw.split(/\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1);

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

class RedisProtocolError extends Error {}

class MinimalRedis {
  constructor(url) {
    this.url = new URL(url);
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.pending = [];
  }

  async connect() {
    const port = Number(this.url.port || (this.url.protocol === "rediss:" ? 6380 : 6379));
    const options = {
      host: this.url.hostname,
      port,
      servername: this.url.hostname,
    };

    this.socket =
      this.url.protocol === "rediss:"
        ? tls.connect(options)
        : net.connect({ host: options.host, port });

    this.socket.on("data", chunk => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.drain();
    });
    this.socket.on("error", error => {
      while (this.pending.length > 0) {
        this.pending.shift().reject(error);
      }
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Redis connect timeout")), 15000);
      this.socket.once("connect", () => {
        clearTimeout(timeout);
        resolve();
      });
      this.socket.once("error", error => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    if (this.url.password) {
      if (this.url.username) {
        await this.command("AUTH", this.url.username, this.url.password);
      } else {
        await this.command("AUTH", this.url.password);
      }
    }
  }

  close() {
    this.socket?.end();
  }

  command(...parts) {
    const payload = Buffer.concat([
      Buffer.from(`*${parts.length}\r\n`),
      ...parts.flatMap(part => {
        const buffer = Buffer.isBuffer(part) ? part : Buffer.from(String(part));
        return [Buffer.from(`$${buffer.length}\r\n`), buffer, Buffer.from("\r\n")];
      }),
    ]);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Redis command timeout: ${parts[0]}`)), 20000);
      this.pending.push({
        resolve: value => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: error => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      this.socket.write(payload);
      this.drain();
    });
  }

  drain() {
    while (this.pending.length > 0) {
      const parsed = this.parseAt(0);

      if (!parsed) {
        return;
      }

      this.buffer = this.buffer.slice(parsed.offset);
      const pending = this.pending.shift();

      if (parsed.error) {
        pending.reject(parsed.error);
      } else {
        pending.resolve(parsed.value);
      }
    }
  }

  parseLine(offset) {
    const end = this.buffer.indexOf("\r\n", offset);

    if (end === -1) {
      return null;
    }

    return {
      line: this.buffer.slice(offset, end).toString("utf8"),
      offset: end + 2,
    };
  }

  parseAt(offset) {
    if (offset >= this.buffer.length) {
      return null;
    }

    const prefix = String.fromCharCode(this.buffer[offset]);
    const line = this.parseLine(offset + 1);

    if (!line) {
      return null;
    }

    if (prefix === "+") {
      return { value: line.line, offset: line.offset };
    }

    if (prefix === "-") {
      return { error: new RedisProtocolError(line.line), offset: line.offset };
    }

    if (prefix === ":") {
      return { value: Number(line.line), offset: line.offset };
    }

    if (prefix === "$") {
      const length = Number(line.line);

      if (length === -1) {
        return { value: null, offset: line.offset };
      }

      const end = line.offset + length;

      if (this.buffer.length < end + 2) {
        return null;
      }

      return {
        value: this.buffer.slice(line.offset, end),
        offset: end + 2,
      };
    }

    if (prefix === "*") {
      const length = Number(line.line);
      const values = [];
      let nextOffset = line.offset;

      if (length === -1) {
        return { value: null, offset: nextOffset };
      }

      for (let index = 0; index < length; index += 1) {
        const item = this.parseAt(nextOffset);

        if (!item) {
          return null;
        }

        if (item.error) {
          return item;
        }

        values.push(item.value);
        nextOffset = item.offset;
      }

      return { value: values, offset: nextOffset };
    }

    throw new Error(`Unsupported Redis response prefix: ${prefix}`);
  }
}

function redisText(value) {
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
}

function computedAuthCookie(env) {
  const password = env.SITE_PASSWORD || "";
  const secret = (env.SITE_AUTH_SECRET || "").trim() || password.trim();
  const token = crypto
    .createHash("sha256")
    .update(`${password}:${secret}`)
    .digest("hex");

  return `memory-system-session=${token}`;
}

async function loginCookie(env) {
  const body = new URLSearchParams();
  body.set("password", env.SITE_PASSWORD || "");
  body.set("next", "/");

  const response = await fetchWithTimeout(`${SITE_URL}/api/auth/login`, {
    method: "POST",
    body,
    redirect: "manual",
  });
  const setCookie = response.headers.get("set-cookie");

  if (!setCookie) {
    return computedAuthCookie(env);
  }

  return setCookie
    .split(/,(?=\s*[^;=]+=[^;]+)/)
    .map(cookie => cookie.split(";")[0].trim())
    .find(cookie => cookie.startsWith("memory-system-session=")) ||
    computedAuthCookie(env);
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function writeBuffer(filePath, buffer) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}

function runTar(outPath) {
  log("creating source archive");
  const result = spawnSync(
    "tar",
    [
      "--exclude",
      "./.git",
      "--exclude",
      "./node_modules",
      "--exclude",
      "./.next",
      "--exclude",
      "./.vercel",
      "--exclude",
      "./backups",
      "--exclude",
      "./.npm-cache",
      "--exclude",
      "./.test-data",
      "--exclude",
      "./test-results",
      "--exclude",
      "./tsconfig.tsbuildinfo",
      "--exclude",
      "./.env.local",
      "--exclude",
      "./.env.test",
      "-czf",
      outPath,
      ".",
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "tar failed");
  }

  log("source archive created");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function backupApi(env, outDir, manifest) {
  log("backing up API snapshots");
  const endpoints = [
    "api/cards",
    "api/mind-palaces",
    "api/plans",
    "api/texts",
    "api/vocabulary",
    "api/study-3/books",
  ];
  const headers = { Cookie: await loginCookie(env) };

  for (const endpoint of endpoints) {
    log(`GET /${endpoint}`);
    const response = await fetchWithTimeout(`${SITE_URL}/${endpoint}`, { headers });
    const body = Buffer.from(await response.arrayBuffer());
    const filePath = path.join(outDir, `${endpoint.replace(/\//g, "__")}.json`);

    await writeBuffer(filePath, body);
    manifest.api.push({
      endpoint,
      status: response.status,
      ok: response.ok,
      bytes: body.length,
      sha256: sha256(body),
      file: path.relative(outDir, filePath),
    });
  }

  log("API snapshots done");
}

async function backupRedis(env, outDir, manifest) {
  log("backing up Redis");
  if (!env.REDIS_URL) {
    manifest.redis.available = false;
    manifest.redis.reason = "REDIS_URL is missing";
    return;
  }

  const client = new MinimalRedis(env.REDIS_URL);
  let count = 0;

  await client.connect();
  manifest.redis.available = true;

  try {
    let cursor = "0";

    do {
      const scan = await client.command("SCAN", cursor, "COUNT", "100");
      cursor = redisText(scan[0]);

      for (const rawKey of scan[1]) {
        const key = redisText(rawKey);
        count += 1;
        log(`Redis key ${count}: ${key}`);
        const type = redisText(await client.command("TYPE", key));
        const ttlMs = await client.command("PTTL", key);
      const keyName = safeName(key);

      const record = {
        key,
        type,
        ttlMs,
      };

      if (type === "string") {
        try {
          const dump = await client.command("DUMP", key);
          const dumpBuffer = Buffer.isBuffer(dump) ? dump : Buffer.from(dump || "");
          const dumpPath = path.join(outDir, "redis", "dump", `${keyName}.rdb64`);

          await writeBuffer(dumpPath, Buffer.from(dumpBuffer.toString("base64"), "utf8"));
          record.dumpBytes = dumpBuffer.length;
          record.dumpSha256 = sha256(dumpBuffer);
          record.dumpFile = path.relative(outDir, dumpPath);
        } catch (error) {
          record.dumpError = error?.message || String(error);
        }

        const value = await client.command("GET", key);
        const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value || "");
        const valuePath = path.join(outDir, "redis", "values", `${keyName}.txt`);

        await writeBuffer(valuePath, buffer);
        record.valueBytes = buffer.length;
        record.valueSha256 = sha256(buffer);
        record.valueFile = path.relative(outDir, valuePath);

        try {
          const parsed = JSON.parse(buffer.toString("utf8"));
          const jsonPath = path.join(outDir, "redis", "json", `${keyName}.json`);

          await writeJson(jsonPath, parsed);
          record.jsonFile = path.relative(outDir, jsonPath);
          record.jsonCount = Array.isArray(parsed) ? parsed.length : undefined;
        } catch {}
      } else if (type === "hash") {
        const hashPath = path.join(outDir, "redis", "hashes", `${keyName}.jsonl`);
        await fs.mkdir(path.dirname(hashPath), { recursive: true });
        const handle = await fs.open(hashPath, "w");
        let hashCursor = "0";
        let hashFields = 0;

        try {
          do {
            const scan = await client.command("HSCAN", key, hashCursor, "COUNT", "50");
            hashCursor = redisText(scan[0]);
            const pairs = scan[1];

            for (let index = 0; index < pairs.length; index += 2) {
              const field = redisText(pairs[index]);
              const value = pairs[index + 1];
              const valueBase64 = Buffer.isBuffer(value)
                ? value.toString("base64")
                : Buffer.from(String(value)).toString("base64");

              await handle.write(
                `${JSON.stringify({ field, valueBase64 })}\n`,
                undefined,
                "utf8"
              );
              hashFields += 1;
            }
          } while (hashCursor !== "0");
        } finally {
          await handle.close();
        }

        record.hashFields = hashFields;
        record.hashFile = path.relative(outDir, hashPath);
      }

      manifest.redis.keys.push(record);
    }
    } while (cursor !== "0");
  } finally {
    client.close();
  }

  log(`Redis backup done: ${count} keys`);
}

async function backupBlob(env, outDir, manifest) {
  log("backing up Vercel Blob");
  if (!env.BLOB_READ_WRITE_TOKEN) {
    manifest.blob.available = false;
    manifest.blob.reason = "BLOB_READ_WRITE_TOKEN is missing";
    return;
  }

  const { list } = await import("@vercel/blob");
  let cursor;

  manifest.blob.available = true;

  do {
    log(`Blob list page${cursor ? ` after cursor ${cursor}` : ""}`);
    const page = await list({
      token: env.BLOB_READ_WRITE_TOKEN,
      limit: 1000,
      cursor,
    });

    for (const blob of page.blobs) {
      log(`Blob object: ${blob.pathname}`);
      const response = await fetchWithTimeout(blob.url, { cache: "no-store" });
      const buffer = Buffer.from(await response.arrayBuffer());
      const filePath = path.join(outDir, "blob", "objects", blob.pathname);

      await writeBuffer(filePath, buffer);
      manifest.blob.objects.push({
        pathname: blob.pathname,
        url: blob.url,
        contentType: blob.contentType,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        fetchStatus: response.status,
        bytes: buffer.length,
        sha256: sha256(buffer),
        file: path.relative(outDir, filePath),
      });
    }

    cursor = page.cursor;
  } while (cursor);

  log(`Vercel Blob backup done: ${manifest.blob.objects.length} objects`);
}

async function main() {
  const env = parseEnv(await fs.readFile(ENV_PATH, "utf8"));
  const id = timestamp();
  const outDir = path.join(BACKUP_ROOT, id);
  const sourceArchive = path.join(outDir, "source", "memory-system-source.tgz");
  const manifest = {
    id,
    createdAt: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    siteUrl: SITE_URL,
    sourceArchive: "source/memory-system-source.tgz",
    envKeys: Object.keys(env).sort(),
    api: [],
    redis: { available: false, keys: [] },
    blob: { available: false, objects: [] },
  };

  await fs.mkdir(path.dirname(sourceArchive), { recursive: true });
  runTar(sourceArchive);

  const sourceBuffer = await fs.readFile(sourceArchive);
  manifest.sourceArchiveBytes = sourceBuffer.length;
  manifest.sourceArchiveSha256 = sha256(sourceBuffer);

  await backupApi(env, outDir, manifest);
  await backupRedis(env, outDir, manifest);
  await backupBlob(env, outDir, manifest);
  await writeJson(path.join(outDir, "manifest.json"), manifest);

  console.log(
    JSON.stringify(
      {
        backupDir: outDir,
        sourceArchiveBytes: manifest.sourceArchiveBytes,
        apiSnapshots: manifest.api.length,
        redisKeys: manifest.redis.keys.length,
        blobObjects: manifest.blob.objects.length,
      },
      null,
      2
    )
  );
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exit(1);
});
