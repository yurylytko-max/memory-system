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

  client.on("error", error => {
    console.error("REDIS_ERROR", error?.message ?? error);
  });

  try {
    await client.connect();
    const raw = await client.get("cards_db");

    if (raw === null) {
      throw new Error("cards_db is missing");
    }

    await client.set("cards_db", raw);

    console.log(
      JSON.stringify({
        rewroteSameValue: true,
        length: raw.length,
      })
    );

    await client.quit();
  } catch (error) {
    console.error("WRITE_FAIL", error?.stack ?? error);

    try {
      if (client.isOpen) {
        await client.quit();
      }
    } catch {}

    process.exit(1);
  }
}

main();
