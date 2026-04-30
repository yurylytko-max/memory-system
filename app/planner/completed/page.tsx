import Link from "next/link";

import PlannerCompletedCollector from "@/components/planner-completed-collector";
import { readCompletedPlannerTasks } from "@/lib/server/planner-completed-tasks-store";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата неизвестна";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTaskDeadline(deadline?: string) {
  if (!deadline) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${deadline}T00:00:00`));
}

export default async function CompletedPlannerTasksPage() {
  const tasks = (await readCompletedPlannerTasks()).sort(
    (a, b) =>
      Date.parse(b.completedAt || "") - Date.parse(a.completedAt || "") ||
      a.text.localeCompare(b.text, "ru")
  );

  return (
    <main
      className="min-h-screen bg-gray-100 px-4 py-10 sm:px-6 lg:px-10"
      data-testid="planner-completed-loaded"
    >
      <div className="mx-auto max-w-5xl">
        <Link href="/planner" className="text-sm text-gray-600">
          ← В планировщик
        </Link>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Выполненные задачи</h1>
            <p className="mt-2 text-sm text-gray-600">
              Всего выполнено:{" "}
              <span data-testid="planner-completed-count">{tasks.length}</span>
            </p>
          </div>

          <PlannerCompletedCollector />
        </div>

        <div className="mt-8 space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
              Пока пусто.
            </div>
          ) : (
            tasks.map((task) => {
              const deadline = formatTaskDeadline(task.deadline);

              return (
                <article
                  key={task.id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                  data-testid="planner-completed-task"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-semibold text-gray-950">
                        {task.text}
                      </h2>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>{task.sourcePlanName}</span>
                        <span>{task.sourcePlanFolder}</span>
                        {task.parentTaskText ? (
                          <span>Подзадача: {task.parentTaskText}</span>
                        ) : null}
                        {deadline ? <span>Дедлайн: {deadline}</span> : null}
                      </div>
                    </div>

                    <time
                      dateTime={task.completedAt}
                      className="shrink-0 text-xs text-gray-500"
                    >
                      {formatDateTime(task.completedAt)}
                    </time>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
