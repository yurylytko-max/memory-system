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

export async function getAllPlans(): Promise<Plan[]> {
  const response = await fetch("/api/plans", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load plans");
  }

  const plans = await response.json();
  return Array.isArray(plans) ? plans : [];
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
