import type { Plan, PlanTask } from "@/lib/plans";
import { parseManagedDailyTaskId } from "@/lib/planner-daily-plans";

export type CompletedPlannerTask = {
  id: string;
  sourcePlanId: string;
  sourcePlanName: string;
  sourcePlanFolder: string;
  sourceTaskId: string;
  sourceTaskPath: number[];
  text: string;
  deadline?: string;
  completedAt: string;
  parentTaskText?: string;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeCompletedPlannerTask(
  task: Partial<CompletedPlannerTask>
): CompletedPlannerTask {
  return {
    id: task.id || createId(),
    sourcePlanId: task.sourcePlanId || "",
    sourcePlanName: task.sourcePlanName || "Без названия",
    sourcePlanFolder: task.sourcePlanFolder || "Без папки",
    sourceTaskId: task.sourceTaskId || "",
    sourceTaskPath: Array.isArray(task.sourceTaskPath)
      ? task.sourceTaskPath.filter((item): item is number => typeof item === "number")
      : [],
    text: task.text || "",
    deadline: task.deadline,
    completedAt: task.completedAt || new Date().toISOString(),
    parentTaskText: task.parentTaskText,
  };
}

export function buildCompletedPlannerTask({
  task,
  plan,
  path,
  completedAt = new Date().toISOString(),
  parentTaskText,
}: {
  task: PlanTask;
  plan: Plan;
  path: number[];
  completedAt?: string;
  parentTaskText?: string;
}): CompletedPlannerTask {
  return normalizeCompletedPlannerTask({
    id: createId(),
    sourcePlanId: plan.id,
    sourcePlanName: plan.name,
    sourcePlanFolder: plan.folder,
    sourceTaskId: task.id,
    sourceTaskPath: path,
    text: task.text,
    deadline: task.deadline,
    completedAt,
    parentTaskText,
  });
}

export function addCompletedPlannerTask(
  tasks: CompletedPlannerTask[],
  task: CompletedPlannerTask
) {
  const normalizedTask = normalizeCompletedPlannerTask(task);
  const alreadyRecorded = tasks.some(
    (item) =>
      item.sourcePlanId === normalizedTask.sourcePlanId &&
      item.sourceTaskId === normalizedTask.sourceTaskId
  );

  if (alreadyRecorded) {
    return tasks.map(normalizeCompletedPlannerTask);
  }

  return [...tasks.map(normalizeCompletedPlannerTask), normalizedTask];
}

export function getCompletedTaskKey(
  task: Pick<CompletedPlannerTask, "sourcePlanId" | "sourceTaskId">
) {
  return `${task.sourcePlanId}:${task.sourceTaskId}`;
}

function getParentTaskText(tasks: PlanTask[], path: number[]) {
  if (path.length < 2) {
    return undefined;
  }

  let currentTasks = tasks;
  let parentTask: PlanTask | undefined;

  for (const index of path.slice(0, -1)) {
    parentTask = currentTasks[index];

    if (!parentTask) {
      return undefined;
    }

    currentTasks = parentTask.subtasks;
  }

  return parentTask?.text;
}

function getSourcePlanForTask(
  plan: Plan,
  task: PlanTask,
  allPlans: Plan[],
  rootTask: PlanTask
) {
  const reference = parseManagedDailyTaskId(rootTask.id);

  if (!reference) {
    return {
      plan,
      task,
    };
  }

  const sourcePlan = allPlans.find((item) => item.id === reference.sourcePlanId);

  return {
    plan: sourcePlan ?? plan,
    task: {
      ...task,
      id: task.id === rootTask.id ? reference.sourceTaskId : task.id,
    },
  };
}

function collectDoneTaskSnapshots({
  plan,
  tasks,
  allPlans,
  pathPrefix = [],
  completedAt,
}: {
  plan: Plan;
  tasks: PlanTask[];
  allPlans: Plan[];
  pathPrefix?: number[];
  completedAt: string;
}) {
  const snapshots: CompletedPlannerTask[] = [];

  for (const [index, task] of tasks.entries()) {
    const path = [...pathPrefix, index];

    if (task.done) {
      const rootTask = plan.tasks[path[0]] ?? task;
      const source = getSourcePlanForTask(plan, task, allPlans, rootTask);

      snapshots.push(
        buildCompletedPlannerTask({
          task: source.task,
          plan: source.plan,
          path,
          completedAt,
          parentTaskText: getParentTaskText(plan.tasks, path),
        })
      );
    }

    snapshots.push(
      ...collectDoneTaskSnapshots({
        plan,
        tasks: task.subtasks,
        allPlans,
        pathPrefix: path,
        completedAt,
      })
    );
  }

  return snapshots;
}

export function collectCompletedPlannerTasksFromPlans({
  plans,
  completedTasks,
  completedAt = new Date().toISOString(),
}: {
  plans: Plan[];
  completedTasks: CompletedPlannerTask[];
  completedAt?: string;
}) {
  const existingTasks = completedTasks.map(normalizeCompletedPlannerTask);
  const knownKeys = new Set(existingTasks.map(getCompletedTaskKey));
  const collectedTasks: CompletedPlannerTask[] = [];

  for (const plan of plans) {
    const snapshots = collectDoneTaskSnapshots({
      plan,
      tasks: plan.tasks,
      allPlans: plans,
      completedAt,
    });

    for (const snapshot of snapshots) {
      const key = getCompletedTaskKey(snapshot);

      if (knownKeys.has(key)) {
        continue;
      }

      knownKeys.add(key);
      collectedTasks.push(snapshot);
    }
  }

  return {
    tasks: [...existingTasks, ...collectedTasks],
    addedTasks: collectedTasks,
    addedCount: collectedTasks.length,
  };
}

export async function getCompletedPlannerTasks(): Promise<CompletedPlannerTask[]> {
  const response = await fetch("/api/planner/completed-tasks", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load completed planner tasks");
  }

  const tasks = await response.json();
  return Array.isArray(tasks) ? tasks.map(normalizeCompletedPlannerTask) : [];
}

export async function createCompletedPlannerTask(task: CompletedPlannerTask) {
  const response = await fetch("/api/planner/completed-tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });

  if (!response.ok) {
    throw new Error("Failed to save completed planner task");
  }
}
