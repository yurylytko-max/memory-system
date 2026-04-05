const fs = require("fs");
const dotenv = require("dotenv");

function loadEnv(path) {
  return dotenv.parse(fs.readFileSync(path, "utf8"));
}

async function main() {
  const env = loadEnv("/tmp/memory-system-prod.env");
  const body = new URLSearchParams({
    password: env.SITE_PASSWORD ?? "",
    next: "/",
  });

  const response = await fetch("https://memory-system-delta.vercel.app/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "manual",
  });

  console.log(
    JSON.stringify(
      {
        status: response.status,
        location: response.headers.get("location"),
        setCookie: response.headers.get("set-cookie"),
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
