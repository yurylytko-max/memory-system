import { describe, expect, test } from "vitest";

import type { Plan } from "@/lib/plans";
import {
  DAILY_PLAN_ID_PREFIX,
  deleteDailyPlanAndSourceTasks,
  mergeDailyPlans,
  synchronizeDailyPlanSources,
} from "@/lib/planner-daily-plans";

function createSourcePlan(): Plan {
  return {
    id: "plan-main",
    name: "Рабочий план",
    folder: "Работа",
    folderOrder: 0,
    tasks: [
      {
        id: "task-1",
        text: "Подготовить релиз",
        done: false,
        deadline: "2026-04-08",
        versions: ["Подготовить релиз"],
        subtasks: [
          {
            id: "task-1-1",
            text: "Прогнать smoke",
            done: false,
            deadline: "2026-04-08",
            versions: ["Прогнать smoke"],
            subtasks: [],
          },
        ],
      },
    ],
  };
}

describe("planner daily plans", () => {
  test("mergeDailyPlans creates a generated daily plan", () => {
    const merged = mergeDailyPlans([createSourcePlan()]);
    const dailyPlan = merged.find((plan) => plan.id === `${DAILY_PLAN_ID_PREFIX}2026-04-08`);

    expect(dailyPlan).toBeTruthy();
    expect(dailyPlan?.tasks).toHaveLength(1);
    expect(dailyPlan?.tasks[0].id).toContain("daily-task:plan-main:task-1");
  });

  test("mergeDailyPlans preserves manual tasks in an existing daily plan", () => {
    const dailyPlan: Plan = {
      id: `${DAILY_PLAN_ID_PREFIX}2026-04-08`,
      name: "День",
      folder: "план на день",
      folderOrder: -1,
      periodStart: "2026-04-08",
      periodEnd: "2026-04-08",
      tasks: [
        {
          id: "manual-note",
          text: "Ручная заметка",
          done: false,
          versions: [],
          subtasks: [],
        },
      ],
    };

    const merged = mergeDailyPlans([createSourcePlan(), dailyPlan]);
    const result = merged.find((plan) => plan.id === dailyPlan.id);

    expect(result?.tasks.some((task) => task.id === "manual-note")).toBe(true);
    expect(result?.tasks.some((task) => task.id.includes("daily-task:plan-main:task-1"))).toBe(
      true
    );
  });

  test("synchronizeDailyPlanSources copies changes back to source plans", () => {
    const merged = mergeDailyPlans([createSourcePlan()]);
    const dailyPlan = merged.find((plan) => plan.id === `${DAILY_PLAN_ID_PREFIX}2026-04-08`)!;
    dailyPlan.tasks[0].text = "Подготовить релиз v2";
    dailyPlan.tasks[0].done = true;
    dailyPlan.tasks[0].subtasks[0].text = "Прогнать smoke и regression";

    const synchronized = synchronizeDailyPlanSources(merged);
    const sourceTask = synchronized[0].tasks[0];

    expect(sourceTask.text).toBe("Подготовить релиз v2");
    expect(sourceTask.done).toBe(true);
    expect(sourceTask.subtasks[0].text).toBe("Прогнать smoke и regression");
  });

  test("deleteDailyPlanAndSourceTasks removes matching source tasks", () => {
    const merged = mergeDailyPlans([createSourcePlan()]);
    const updated = deleteDailyPlanAndSourceTasks(
      merged,
      `${DAILY_PLAN_ID_PREFIX}2026-04-08`
    );

    expect(updated.some((plan) => plan.id.startsWith(DAILY_PLAN_ID_PREFIX))).toBe(false);
    expect(updated[0].tasks).toEqual([]);
  });
});
