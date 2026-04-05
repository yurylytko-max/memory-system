const fs = require("fs");
const crypto = require("crypto");
const dotenv = require("dotenv");

function loadEnv(path) {
  return dotenv.parse(fs.readFileSync(path, "utf8"));
}

async function main() {
  const env = loadEnv("/tmp/memory-system-prod.env");
  const password = env.SITE_PASSWORD ?? "";
  const secret = (env.SITE_AUTH_SECRET ?? "").trim() || password.trim();
  const token = crypto
    .createHash("sha256")
    .update(`${password}:${secret}`)
    .digest("hex");

  const response = await fetch("https://memory-system-delta.vercel.app/api/cards", {
    headers: {
      Cookie: `memory-system-session=${token}`,
    },
  });

  const text = await response.text();

  console.log(
    JSON.stringify(
      {
        status: response.status,
        ok: response.ok,
        bodyPreview: text.slice(0, 500),
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
