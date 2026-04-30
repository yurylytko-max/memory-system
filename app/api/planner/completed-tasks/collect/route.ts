import { NextResponse } from "next/server";

import { collectCompletedPlannerTasksFromPlans } from "@/lib/planner-completed-tasks";
import { readPlans } from "@/lib/server/plans-store";
import {
  appendCompletedPlannerTasks,
  readCompletedPlannerTasks,
} from "@/lib/server/planner-completed-tasks-store";

export async function POST() {
  const [plans, completedTasks] = await Promise.all([
    readPlans(),
    readCompletedPlannerTasks(),
  ]);
  const result = collectCompletedPlannerTasksFromPlans({
    plans,
    completedTasks,
  });

  const addedCount =
    result.addedTasks.length > 0
      ? await appendCompletedPlannerTasks(result.addedTasks)
      : 0;

  return NextResponse.json({
    success: true,
    addedCount,
    totalCount: completedTasks.length + addedCount,
  });
}
