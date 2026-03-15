export type PlanTask = {
  id: string;
  text: string;
  done: boolean;
  deadline?: string;
  versions: string[];
};

export type Plan = {
  id: string;
  name: string;
  folder: string;
  tasks: PlanTask[];
};

const LEGACY_PLANS_STORAGE_KEY = "plans";

function clearLegacyPlans() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGACY_PLANS_STORAGE_KEY);
}

function normalizeTask(task: Partial<PlanTask>): PlanTask {
  return {
    id: task.id || crypto.randomUUID(),
    text: task.text || "",
    done: Boolean(task.done),
    deadline: task.deadline,
    versions: Array.isArray(task.versions) ? task.versions : [],
  };
}

function normalizePlan(plan: Partial<Plan>): Plan {
  return {
    id: plan.id || crypto.randomUUID(),
    name: plan.name || "Без названия",
    folder: plan.folder || "Без папки",
    tasks: Array.isArray(plan.tasks) ? plan.tasks.map(normalizeTask) : [],
  };
}

export async function getAllPlans(): Promise<Plan[]> {
  const response = await fetch("/api/plans", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load plans");
  }

  const plans = await response.json();
  return Array.isArray(plans) ? plans : [];
}

function mergePlans(serverPlans: Plan[], legacyPlans: Plan[]) {
  if (legacyPlans.length === 0) {
    return serverPlans;
  }

  const merged = new Map<string, Plan>();

  for (const plan of serverPlans) {
    merged.set(plan.id, normalizePlan(plan));
  }

  for (const plan of legacyPlans) {
    if (!merged.has(plan.id)) {
      merged.set(plan.id, normalizePlan(plan));
    }
  }

  return Array.from(merged.values());
}

export async function getPlan(id: string): Promise<Plan | undefined> {
  const response = await fetch(`/api/plans/${id}`, { cache: "no-store" });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error("Failed to load plan");
  }

  return await response.json();
}

export async function savePlans(plans: Plan[]) {
  const response = await fetch("/api/plans", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plans),
  });

  if (!response.ok) {
    throw new Error("Failed to save plans");
  }
}

export function getLegacyPlans(): Plan[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(LEGACY_PLANS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizePlan) : [];
  } catch {
    return [];
  }
}

export async function migrateLegacyPlansToServer() {
  const legacyPlans = getLegacyPlans();
  const serverPlans = await getAllPlans();

  if (legacyPlans.length === 0) {
    return serverPlans;
  }

  const mergedPlans = mergePlans(serverPlans, legacyPlans);

  if (mergedPlans.length !== serverPlans.length) {
    await savePlans(mergedPlans);
  }

  clearLegacyPlans();

  return mergedPlans;
}

export async function createPlan(plan: Plan) {
  const response = await fetch("/api/plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plan),
  });

  if (!response.ok) {
    throw new Error("Failed to create plan");
  }
}

export async function updatePlan(plan: Plan) {
  const response = await fetch(`/api/plans/${plan.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plan),
  });

  if (!response.ok) {
    throw new Error("Failed to update plan");
  }
}

export async function deletePlan(id: string) {
  const response = await fetch(`/api/plans/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete plan");
  }
}
