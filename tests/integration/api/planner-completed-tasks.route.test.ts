import { describe, expect, test } from "vitest";

import { GET, POST } from "@/app/api/planner/completed-tasks/route";
import { readCompletedPlannerTasks } from "@/lib/server/planner-completed-tasks-store";

const completedTask = {
  id: "completed-1",
  sourcePlanId: "plan-work",
  sourcePlanName: "Рабочий план",
  sourcePlanFolder: "Работа",
  sourceTaskId: "task-1",
  sourceTaskPath: [0],
  text: "Подготовить релиз",
  completedAt: "2026-04-08T12:00:00.000Z",
};

describe("planner completed tasks route", () => {
  test("GET returns an empty array by default", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  test("POST stores a completed task independently", async () => {
    const response = await POST(
      new Request("http://localhost/api/planner/completed-tasks", {
        method: "POST",
        body: JSON.stringify(completedTask),
      })
    );

    expect(response.status).toBe(200);
    expect(await readCompletedPlannerTasks()).toMatchObject([completedTask]);
  });

  test("POST does not duplicate the same source task", async () => {
    await POST(
      new Request("http://localhost/api/planner/completed-tasks", {
        method: "POST",
        body: JSON.stringify(completedTask),
      })
    );

    await POST(
      new Request("http://localhost/api/planner/completed-tasks", {
        method: "POST",
        body: JSON.stringify({ ...completedTask, id: "completed-2" }),
      })
    );

    expect(await readCompletedPlannerTasks()).toHaveLength(1);
  });
});
