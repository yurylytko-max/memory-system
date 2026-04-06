import { describe, expect, test } from "vitest";

import { buildDailyPlanTask } from "@/lib/planner-daily-plans";
import type { Plan, PlanTask } from "@/lib/plans";

function createTask(): PlanTask {
  return {
    id: "parent-task",
    text: "Родитель",
    done: false,
    deadline: "2026-04-08",
    versions: ["Родитель"],
    subtasks: [
      {
        id: "child-task",
        text: "Подзадача",
        done: false,
        deadline: "2026-04-08",
        versions: ["Подзадача"],
        subtasks: [],
      },
    ],
  };
}

describe("planner subtasks helpers", () => {
  test("buildDailyPlanTask preserves versions and subtask tree", () => {
    const sourcePlan: Plan = {
      id: "source-plan",
      name: "Source",
      folder: "Работа",
      tasks: [createTask()],
    };

    const dailyTask = buildDailyPlanTask(createTask(), sourcePlan);

    expect(dailyTask.versions).toEqual(["Родитель"]);
    expect(dailyTask.subtasks).toHaveLength(1);
    expect(dailyTask.subtasks[0].versions).toEqual(["Подзадача"]);
  });
});
