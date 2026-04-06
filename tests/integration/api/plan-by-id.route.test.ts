import { describe, expect, test } from "vitest";

import { normalizePlan } from "@/lib/plans";
import { writePlans } from "@/lib/server/plans-store";
import {
  DELETE,
  GET,
  PUT,
} from "@/app/api/plans/[id]/route";

describe("plan by id route", () => {
  test("GET returns a plan", async () => {
    const plan = normalizePlan({
      id: "plan-1",
      name: "План 1",
      folder: "Работа",
      tasks: [],
    });
    await writePlans([plan]);

    const response = await GET(new Request("http://localhost/api/plans/plan-1"), {
      params: Promise.resolve({ id: "plan-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(plan);
  });

  test("GET returns 404 for missing plan", async () => {
    const response = await GET(new Request("http://localhost/api/plans/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  test("PUT updates an existing plan", async () => {
    const plan = normalizePlan({
      id: "plan-1",
      name: "План 1",
      folder: "Работа",
      tasks: [],
    });
    await writePlans([plan]);

    const updatedPlan = {
      ...plan,
      name: "Обновлённый план",
    };

    const response = await PUT(
      new Request("http://localhost/api/plans/plan-1", {
        method: "PUT",
        body: JSON.stringify(updatedPlan),
      }),
      {
        params: Promise.resolve({ id: "plan-1" }),
      }
    );

    expect(response.status).toBe(200);
    expect(
      await GET(new Request("http://localhost/api/plans/plan-1"), {
        params: Promise.resolve({ id: "plan-1" }),
      }).then((value) => value.json())
    ).toEqual(updatedPlan);
  });

  test("DELETE removes an ordinary plan", async () => {
    const plan = normalizePlan({
      id: "plan-1",
      name: "План 1",
      folder: "Работа",
      tasks: [],
    });
    await writePlans([plan]);

    const response = await DELETE(new Request("http://localhost/api/plans/plan-1"), {
      params: Promise.resolve({ id: "plan-1" }),
    });

    expect(response.status).toBe(200);
    expect(
      await GET(new Request("http://localhost/api/plans/plan-1"), {
        params: Promise.resolve({ id: "plan-1" }),
      }).then((value) => value.status)
    ).toBe(404);
  });
});
