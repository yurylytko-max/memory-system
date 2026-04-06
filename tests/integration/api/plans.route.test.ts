import { describe, expect, test } from "vitest";

import { normalizePlan } from "@/lib/plans";
import { readPlans } from "@/lib/server/plans-store";
import { GET, POST, PUT } from "@/app/api/plans/route";

describe("plans route", () => {
  test("GET returns an empty array by default", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  test("POST creates a plan", async () => {
    const plan = normalizePlan({
      id: "plan-1",
      name: "План 1",
      folder: "Работа",
      tasks: [],
    });

    const response = await POST(
      new Request("http://localhost/api/plans", {
        method: "POST",
        body: JSON.stringify(plan),
      })
    );

    expect(response.status).toBe(200);
    expect(await readPlans()).toEqual([plan]);
  });

  test("PUT replaces the plans collection", async () => {
    const plans = [
      normalizePlan({ id: "plan-a", name: "A", folder: "X", tasks: [] }),
      normalizePlan({ id: "plan-b", name: "B", folder: "Y", tasks: [] }),
    ];

    const response = await PUT(
      new Request("http://localhost/api/plans", {
        method: "PUT",
        body: JSON.stringify(plans),
      })
    );

    expect(response.status).toBe(200);
    expect(await GET().then((value) => value.json())).toEqual(plans);
  });
});
