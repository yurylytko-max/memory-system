const fs = require("fs");
const crypto = require("crypto");
const dotenv = require("dotenv");

function loadEnv(path) {
  return dotenv.parse(fs.readFileSync(path, "utf8"));
}

function createToken(env) {
  const password = env.SITE_PASSWORD ?? "";
  const secret = (env.SITE_AUTH_SECRET ?? "").trim() || password.trim();

  return crypto
    .createHash("sha256")
    .update(`${password}:${secret}`)
    .digest("hex");
}

async function main() {
  const env = loadEnv("/tmp/memory-system-prod.env");
  const token = createToken(env);
  const headers = {
    Cookie: `memory-system-session=${token}`,
    "content-type": "application/json",
  };

  const getResponse = await fetch("https://memory-system-delta.vercel.app/api/cards", {
    headers,
  });

  if (!getResponse.ok) {
    throw new Error(`GET failed with ${getResponse.status}: ${await getResponse.text()}`);
  }

  const cards = await getResponse.json();

  const putResponse = await fetch("https://memory-system-delta.vercel.app/api/cards", {
    method: "PUT",
    headers,
    body: JSON.stringify(cards),
  });

  const body = await putResponse.text();

  console.log(
    JSON.stringify(
      {
        getStatus: getResponse.status,
        putStatus: putResponse.status,
        putBody: body.slice(0, 500),
        cardsCount: Array.isArray(cards) ? cards.length : null,
      },
      null,
      2
    )
  );
}

main().catch(error => {
  console.error(error?.stack ?? error);
  process.exit(1);
});
