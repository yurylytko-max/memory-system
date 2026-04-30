import { describe, expect, test } from "vitest";

import {
  addCompletedPlannerTask,
  buildCompletedPlannerTask,
  collectCompletedPlannerTasksFromPlans,
} from "@/lib/planner-completed-tasks";
import type { Plan, PlanTask } from "@/lib/plans";

function createPlan(): Plan {
  return {
    id: "plan-work",
    name: "Рабочий план",
    folder: "Работа",
    tasks: [
      {
        id: "task-parent",
        text: "Подготовить релиз",
        done: false,
        versions: [],
        subtasks: [
          {
            id: "task-child",
            text: "Прогнать smoke",
            done: false,
            deadline: "2026-04-08",
            versions: [],
            subtasks: [],
          },
        ],
      },
    ],
  };
}

describe("planner completed tasks", () => {
  test("buildCompletedPlannerTask creates an independent task snapshot", () => {
    const plan = createPlan();
    const task = plan.tasks[0].subtasks[0];

    const completedTask = buildCompletedPlannerTask({
      task,
      plan,
      path: [0, 0],
      parentTaskText: plan.tasks[0].text,
      completedAt: "2026-04-08T12:00:00.000Z",
    });

    task.text = "Изменённая формулировка";

    expect(completedTask).toMatchObject({
      sourcePlanId: "plan-work",
      sourcePlanName: "Рабочий план",
      sourceTaskId: "task-child",
      sourceTaskPath: [0, 0],
      text: "Прогнать smoke",
      deadline: "2026-04-08",
      parentTaskText: "Подготовить релиз",
      completedAt: "2026-04-08T12:00:00.000Z",
    });
  });

  test("addCompletedPlannerTask records a source task only once", () => {
    const plan = createPlan();
    const task: PlanTask = plan.tasks[0];
    const completedTask = buildCompletedPlannerTask({
      task,
      plan,
      path: [0],
      completedAt: "2026-04-08T12:00:00.000Z",
    });

    const tasks = addCompletedPlannerTask([], completedTask);
    const repeatedTasks = addCompletedPlannerTask(tasks, {
      ...completedTask,
      id: "second-record",
      text: "Повторное завершение",
    });

    expect(repeatedTasks).toHaveLength(1);
    expect(repeatedTasks[0].text).toBe("Подготовить релиз");
  });

  test("collectCompletedPlannerTasksFromPlans only appends missing done tasks", () => {
    const plan = createPlan();
    plan.tasks[0].done = true;
    plan.tasks[0].subtasks[0].done = true;

    const existingTask = buildCompletedPlannerTask({
      task: plan.tasks[0],
      plan,
      path: [0],
      completedAt: "2026-04-08T12:00:00.000Z",
    });

    const result = collectCompletedPlannerTasksFromPlans({
      plans: [plan],
      completedTasks: [existingTask],
      completedAt: "2026-04-09T12:00:00.000Z",
    });

    expect(result.addedCount).toBe(1);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].completedAt).toBe("2026-04-08T12:00:00.000Z");
    expect(result.tasks[1]).toMatchObject({
      sourcePlanId: "plan-work",
      sourceTaskId: "task-child",
      text: "Прогнать smoke",
      parentTaskText: "Подготовить релиз",
      completedAt: "2026-04-09T12:00:00.000Z",
    });
  });
});
