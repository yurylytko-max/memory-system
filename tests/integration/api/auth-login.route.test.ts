import { describe, expect, test } from "vitest";

import { POST } from "@/app/api/auth/login/route";
import { SITE_AUTH_COOKIE } from "@/lib/auth";

function buildRequest(body: URLSearchParams) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

describe("auth login route", () => {
  test("sets auth cookie for valid password", async () => {
    const response = await POST(
      buildRequest(
        new URLSearchParams({
          password: process.env.SITE_PASSWORD ?? "test-password",
          next: "/planner",
        })
      )
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toContain(SITE_AUTH_COOKIE);
    expect(response.headers.get("location")).toBe("http://localhost/planner");
  });

  test("rejects invalid password", async () => {
    const response = await POST(
      buildRequest(
        new URLSearchParams({
          password: "wrong-password",
          next: "/planner",
        })
      )
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?error=1");
  });

  test("sanitizes unsafe next path", async () => {
    const response = await POST(
      buildRequest(
        new URLSearchParams({
          password: process.env.SITE_PASSWORD ?? "test-password",
          next: "//evil.example",
        })
      )
    );

    expect(response.headers.get("location")).toBe("http://localhost/");
  });
});
