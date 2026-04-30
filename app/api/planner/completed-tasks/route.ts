import { NextResponse } from "next/server";

import {
  normalizeCompletedPlannerTask,
  type CompletedPlannerTask,
} from "@/lib/planner-completed-tasks";
import {
  appendCompletedPlannerTask,
  readCompletedPlannerTasks,
} from "@/lib/server/planner-completed-tasks-store";

export async function GET() {
  const tasks = await readCompletedPlannerTasks();
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const task = normalizeCompletedPlannerTask(
    (await request.json()) as Partial<CompletedPlannerTask>
  );
  const addedCount = await appendCompletedPlannerTask(task);

  return NextResponse.json({ success: true, addedCount });
}
