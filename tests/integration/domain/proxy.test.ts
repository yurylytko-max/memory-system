import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";

import { createSiteAuthToken } from "@/lib/auth";
import { proxy } from "@/proxy";

describe("proxy auth guard", () => {
  test("redirects unauthenticated page requests to login", async () => {
    const request = new NextRequest("http://localhost/planner");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=%2Fplanner");
  });

  test("returns 401 for unauthenticated api requests", async () => {
    const request = new NextRequest("http://localhost/api/cards");
    const response = await proxy(request);

    expect(response.status).toBe(401);
  });

  test("allows authenticated page requests", async () => {
    const token = await createSiteAuthToken(process.env.SITE_PASSWORD);
    const request = new NextRequest("http://localhost/planner", {
      headers: {
        cookie: `memory-system-session=${token}`,
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });
});
