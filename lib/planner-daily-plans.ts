import type { Plan, PlanTask } from "@/lib/plans";

export const DAILY_PLAN_FOLDER = "план на день";
export const DAILY_PLAN_ID_PREFIX = "daily-plan:";
const DAILY_TASK_ID_PREFIX = "daily-task:";

type DailyTaskSource = {
  task: PlanTask;
  sourcePlan: Plan;
};

type ManualDailyTask = {
  task: PlanTask;
  date: string;
};

function cloneTaskTree(task: PlanTask): PlanTask {
  return {
    ...task,
    versions: [...task.versions],
    subtasks: task.subtasks.map(cloneTaskTree),
  };
}

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

function buildManagedTaskReferenceKey(sourcePlanId: string, sourceTaskId: string) {
  return `${sourcePlanId}:${sourceTaskId}`;
}

export function getDailyPlanDate(plan: Pick<Plan, "id" | "periodStart">) {
  if (plan.periodStart) {
    return plan.periodStart;
  }

  if (!isDailyPlanId(plan.id)) {
    return null;
  }

  return plan.id.slice(DAILY_PLAN_ID_PREFIX.length) || null;
}

export function parseManagedDailyTaskId(taskId: string) {
  const normalizedTaskId = taskId.startsWith(DAILY_TASK_ID_PREFIX)
    ? taskId.slice(DAILY_TASK_ID_PREFIX.length)
    : taskId;
  const separatorIndex = normalizedTaskId.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const sourcePlanId = normalizedTaskId.slice(0, separatorIndex);
  const sourceTaskId = normalizedTaskId.slice(separatorIndex + 1);

  if (!sourcePlanId || !sourceTaskId) {
    return null;
  }

  return {
    sourcePlanId,
    sourceTaskId,
  };
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
    text: task.text,
    done: task.done,
    deadline: task.deadline,
    versions: [...task.versions],
    subtasks: task.subtasks.map(cloneTaskTree),
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

function collectManualDailyTasks(plans: Plan[]) {
  const manualTasks: ManualDailyTask[] = [];

  for (const plan of plans) {
    if (!isDailyPlan(plan)) {
      continue;
    }

    const planDate = getDailyPlanDate(plan);

    for (const task of plan.tasks) {
      if (isManagedDailyTask(task)) {
        continue;
      }

      const targetDate = task.deadline || planDate;

      if (!targetDate) {
        continue;
      }

      manualTasks.push({
        task: cloneTaskTree(task),
        date: targetDate,
      });
    }
  }

  return manualTasks;
}

export function mergeDailyPlans(plans: Plan[]) {
  const generatedDailyPlans = buildDailyPlans(plans);
  const manualTasksByDate = new Map<string, PlanTask[]>();

  for (const { task, date } of collectManualDailyTasks(plans)) {
    const currentTasks = manualTasksByDate.get(date) ?? [];
    currentTasks.push(task);
    manualTasksByDate.set(date, currentTasks);
  }

  for (const [date, manualTasks] of manualTasksByDate) {
    const generatedPlan = generatedDailyPlans.find(
      (plan) => getDailyPlanDate(plan) === date
    );

    if (generatedPlan) {
      generatedPlan.tasks = [...manualTasks, ...generatedPlan.tasks];
      continue;
    }

    generatedDailyPlans.push({
      id: `${DAILY_PLAN_ID_PREFIX}${date}`,
      name: formatDailyPlanName(date),
      folder: DAILY_PLAN_FOLDER,
      folderOrder: -1,
      periodStart: date,
      periodEnd: date,
      tasks: manualTasks,
    });
  }

  generatedDailyPlans.sort((a, b) =>
    (getDailyPlanDate(a) ?? "").localeCompare(getDailyPlanDate(b) ?? "")
  );

  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const mergedPlans = plans.filter((plan) => !isDailyPlan(plan));
  const generatedPlanIds = new Set(generatedDailyPlans.map((plan) => plan.id));

  for (const generatedPlan of generatedDailyPlans) {
    const existingPlan = plansById.get(generatedPlan.id);

    if (!existingPlan) {
      mergedPlans.push(generatedPlan);
      continue;
    }

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
      tasks: generatedPlan.tasks,
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

export function synchronizeDailyPlanSources(plans: Plan[]) {
  const dailyPlans = plans.filter(isDailyPlan);

  if (dailyPlans.length === 0) {
    return plans;
  }

  let synchronizedPlans = [...plans];
  const originalPlansById = new Map(plans.map((plan) => [plan.id, plan]));

  for (const dailyPlan of dailyPlans) {
    const dailyPlanDate = getDailyPlanDate(dailyPlan);

    if (!dailyPlanDate) {
      continue;
    }

    const managedTasks = new Map<string, PlanTask>();

    for (const task of dailyPlan.tasks) {
      const reference = parseManagedDailyTaskId(task.id);

      if (!reference) {
        continue;
      }

      managedTasks.set(
        buildManagedTaskReferenceKey(reference.sourcePlanId, reference.sourceTaskId),
        task
      );
    }

    synchronizedPlans = synchronizedPlans.map((plan) => {
      if (isDailyPlan(plan)) {
        return plan;
      }

      const tasks = plan.tasks.flatMap((task) => {
        const originalTask = originalPlansById
          .get(plan.id)
          ?.tasks.find((item) => item.id === task.id);

        if (originalTask?.deadline !== dailyPlanDate) {
          return [task];
        }

        const managedTask = managedTasks.get(
          buildManagedTaskReferenceKey(plan.id, task.id)
        );

        if (!managedTask) {
          return [];
        }

        return [
          {
            ...task,
            text: managedTask.text,
            done: managedTask.done,
            deadline: managedTask.deadline,
            versions: [...managedTask.versions],
            subtasks: managedTask.subtasks.map(cloneTaskTree),
          },
        ];
      });

      return {
        ...plan,
        tasks,
      };
    });
  }

  return synchronizedPlans;
}

export function deleteDailyPlanAndSourceTasks(plans: Plan[], dailyPlanId: string) {
  const dailyPlan = plans.find((plan) => plan.id === dailyPlanId);

  if (!dailyPlan || !isDailyPlan(dailyPlan)) {
    return plans.filter((plan) => plan.id !== dailyPlanId);
  }

  const dailyPlanDate = getDailyPlanDate(dailyPlan);

  if (!dailyPlanDate) {
    return plans.filter((plan) => plan.id !== dailyPlanId);
  }

  return plans
    .filter((plan) => plan.id !== dailyPlanId)
    .map((plan) => {
      if (isDailyPlan(plan)) {
        return plan;
      }

      return {
        ...plan,
        tasks: plan.tasks.filter((task) => task.deadline !== dailyPlanDate),
      };
    });
}

export function findDailyPlan(plans: Plan[], planId: string) {
  const normalizedPlanId = decodeURIComponent(planId);
  return (
    mergeDailyPlans(plans).find((plan) => plan.id === normalizedPlanId) ?? null
  );
}
