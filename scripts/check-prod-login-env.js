async function main() {
  const body = new URLSearchParams({
    password: process.env.SITE_PASSWORD ?? "",
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
        passwordLength: (process.env.SITE_PASSWORD ?? "").length,
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
