const fs = require("fs");
const { createClient } = require("redis");

function loadEnv(path) {
  const entries = fs
    .readFileSync(path, "utf8")
    .split(/\n/)
    .filter(Boolean)
    .filter(line => !line.startsWith("#"))
    .map(line => {
      const index = line.indexOf("=");
      const key = line.slice(0, index);
      let value = line.slice(index + 1);

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      return [key, value];
    });

  return Object.fromEntries(entries);
}

async function main() {
  const env = loadEnv("/tmp/memory-system-prod.env");
  const client = createClient({ url: env.REDIS_URL });

  const timeout = setTimeout(() => {
    console.error("CONNECT_TIMEOUT");
    process.exit(124);
  }, 15000);

  client.on("error", error => {
    console.error("REDIS_ERROR", error?.message ?? error);
  });

  try {
    await client.connect();
    const raw = await client.get("cards_db");

    clearTimeout(timeout);

    console.log(
      JSON.stringify({
        connected: true,
        hasCardsDb: raw !== null,
        length: raw ? raw.length : 0,
      })
    );

    await client.quit();
  } catch (error) {
    clearTimeout(timeout);
    console.error("CONNECT_FAIL", error?.stack ?? error);

    try {
      if (client.isOpen) {
        await client.quit();
      }
    } catch {}

    process.exit(1);
  }
}

main();
