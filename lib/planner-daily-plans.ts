import type { Plan, PlanTask } from "@/lib/plans";

export const DAILY_PLAN_FOLDER = "план на день";
export const DAILY_PLAN_ID_PREFIX = "daily-plan:";
const DAILY_TASK_ID_PREFIX = "daily-task:";

type DailyTaskSource = {
  task: PlanTask;
  sourcePlan: Plan;
};

export function isDailyPlanId(planId: string) {
  return planId.startsWith(DAILY_PLAN_ID_PREFIX);
}

export function isDailyPlan(plan: Pick<Plan, "id" | "folder">) {
  return plan.folder === DAILY_PLAN_FOLDER || isDailyPlanId(plan.id);
}

export function formatDailyPlanName(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00`));
}

function buildDailyTaskId(sourcePlan: Plan, task: PlanTask) {
  return `${DAILY_TASK_ID_PREFIX}${sourcePlan.id}:${task.id}`;
}

function isLegacyManagedDailyTaskId(taskId: string) {
  return taskId.includes(":");
}

function isManagedDailyTask(task: PlanTask) {
  return (
    task.id.startsWith(DAILY_TASK_ID_PREFIX) ||
    isLegacyManagedDailyTaskId(task.id)
  );
}

export function buildDailyPlanTask(task: PlanTask, sourcePlan: Plan): PlanTask {
  return {
    id: buildDailyTaskId(sourcePlan, task),
    text: `${task.text} (${sourcePlan.name})`,
    done: task.done,
    deadline: task.deadline,
    versions: [],
  };
}

export function buildDailyPlans(plans: Plan[]) {
  const tasksByDeadline = new Map<string, DailyTaskSource[]>();

  for (const plan of plans) {
    if (isDailyPlan(plan)) {
      continue;
    }

    for (const task of plan.tasks) {
      if (!task.deadline) {
        continue;
      }

      const currentTasks = tasksByDeadline.get(task.deadline) ?? [];
      currentTasks.push({ task, sourcePlan: plan });
      tasksByDeadline.set(task.deadline, currentTasks);
    }
  }

  return Array.from(tasksByDeadline.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, deadlineTasks]) => ({
      id: `${DAILY_PLAN_ID_PREFIX}${date}`,
      name: formatDailyPlanName(date),
      folder: DAILY_PLAN_FOLDER,
      folderOrder: -1,
      periodStart: date,
      periodEnd: date,
      tasks: deadlineTasks.map(({ task, sourcePlan }) =>
        buildDailyPlanTask(task, sourcePlan)
      ),
    }));
}

export function mergeDailyPlans(plans: Plan[]) {
  const generatedDailyPlans = buildDailyPlans(plans);
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const mergedPlans = plans.filter((plan) => !isDailyPlan(plan));
  const generatedPlanIds = new Set(generatedDailyPlans.map((plan) => plan.id));

  for (const generatedPlan of generatedDailyPlans) {
    const existingPlan = plansById.get(generatedPlan.id);

    if (!existingPlan) {
      mergedPlans.push(generatedPlan);
      continue;
    }

    const generatedTaskIds = new Set(generatedPlan.tasks.map((task) => task.id));
    const preservedManualTasks = existingPlan.tasks.filter(
      (task) => !isManagedDailyTask(task)
    );

    const mergedPlan: Plan = {
      ...existingPlan,
      name: generatedPlan.name,
      folder: DAILY_PLAN_FOLDER,
      folderOrder:
        typeof existingPlan.folderOrder === "number"
          ? existingPlan.folderOrder
          : generatedPlan.folderOrder,
      periodStart: generatedPlan.periodStart,
      periodEnd: generatedPlan.periodEnd,
      tasks: [
        ...preservedManualTasks.filter((task) => !generatedTaskIds.has(task.id)),
        ...generatedPlan.tasks,
      ],
    };

    const existingIndex = mergedPlans.findIndex((plan) => plan.id === generatedPlan.id);

    if (existingIndex !== -1) {
      mergedPlans[existingIndex] = mergedPlan;
      continue;
    }

    mergedPlans.push(mergedPlan);
  }

  return mergedPlans.filter(
    (plan) => !isDailyPlan(plan) || generatedPlanIds.has(plan.id)
  );
}

export function findDailyPlan(plans: Plan[], planId: string) {
  const normalizedPlanId = decodeURIComponent(planId);
  return (
    mergeDailyPlans(plans).find((plan) => plan.id === normalizedPlanId) ?? null
  );
}
