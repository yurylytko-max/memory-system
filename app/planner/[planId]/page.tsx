"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlannerNotificationsButton from "@/components/planner-notifications-button";
import {
  migrateLegacyPlansToServer,
  savePlans,
  type Plan,
  type PlanTask,
} from "@/lib/plans";
import {
  findDailyPlan,
  isDailyPlanId,
  mergeDailyPlans,
  parseManagedDailyTaskId,
  synchronizeDailyPlanSources,
} from "@/lib/planner-daily-plans";

type TaskPath = number[];

function createTask(text: string): PlanTask {
  return {
    id: crypto.randomUUID(),
    text,
    done: false,
    versions: [],
    subtasks: [],
  };
}

function formatPlanPeriod(plan: Pick<Plan, "periodStart" | "periodEnd">) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (plan.periodStart && plan.periodEnd) {
    return `${formatter.format(new Date(`${plan.periodStart}T00:00:00`))} - ${formatter.format(new Date(`${plan.periodEnd}T00:00:00`))}`;
  }

  if (plan.periodStart) {
    return `С ${formatter.format(new Date(`${plan.periodStart}T00:00:00`))}`;
  }

  if (plan.periodEnd) {
    return `До ${formatter.format(new Date(`${plan.periodEnd}T00:00:00`))}`;
  }

  return null;
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

function getTaskDeadlineTone(deadline?: string, done?: boolean) {
  if (!deadline || done) {
    return "text-gray-500";
  }

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (deadline < todayIso) {
    return "text-red-600";
  }

  if (deadline === todayIso) {
    return "text-amber-600";
  }

  return "text-gray-500";
}

function getDeadlineSortValue(deadline?: string) {
  return deadline
    ? Date.parse(`${deadline}T00:00:00`)
    : Number.POSITIVE_INFINITY;
}

function pathToKey(path: TaskPath) {
  return path.join("-");
}

function getTaskAtPath(tasks: PlanTask[], path: TaskPath): PlanTask | null {
  let currentTasks = tasks;
  let currentTask: PlanTask | null = null;

  for (const index of path) {
    currentTask = currentTasks[index] ?? null;

    if (!currentTask) {
      return null;
    }

    currentTasks = currentTask.subtasks;
  }

  return currentTask;
}

function updateTaskAtPath(
  tasks: PlanTask[],
  path: TaskPath,
  updater: (task: PlanTask) => PlanTask
): PlanTask[] {
  const [currentIndex, ...rest] = path;

  return tasks.map((task, index) => {
    if (index !== currentIndex) {
      return task;
    }

    if (rest.length === 0) {
      return updater(task);
    }

    return {
      ...task,
      subtasks: updateTaskAtPath(task.subtasks, rest, updater),
    };
  });
}

function removeTaskAtPath(tasks: PlanTask[], path: TaskPath): PlanTask[] {
  const [currentIndex, ...rest] = path;

  if (rest.length === 0) {
    return tasks.filter((_, index) => index !== currentIndex);
  }

  return tasks.map((task, index) => {
    if (index !== currentIndex) {
      return task;
    }

    return {
      ...task,
      subtasks: removeTaskAtPath(task.subtasks, rest),
    };
  });
}

function taskMatchesSearch(task: PlanTask, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  if (task.text.toLowerCase().includes(normalizedSearch)) {
    return true;
  }

  return task.subtasks.some((subtask) => taskMatchesSearch(subtask, normalizedSearch));
}

function getSourcePlanName(taskId: string, plans: Plan[]) {
  const reference = parseManagedDailyTaskId(taskId);

  if (!reference) {
    return null;
  }

  return plans.find((plan) => plan.id === reference.sourcePlanId)?.name ?? null;
}

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = decodeURIComponent(params.planId as string);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [planName, setPlanName] = useState("");
  const [activeTaskKey, setActiveTaskKey] = useState<string | null>(null);
  const [moveTaskIndex, setMoveTaskIndex] = useState<number | null>(null);
  const [subtaskDraftForKey, setSubtaskDraftForKey] = useState<string | null>(null);
  const [subtaskDraftValue, setSubtaskDraftValue] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      const parsed = await migrateLegacyPlansToServer();
      const isDailyPlanRoute = isDailyPlanId(planId);
      const resolvedPlans = isDailyPlanRoute ? mergeDailyPlans(parsed) : parsed;
      const currentPlan = isDailyPlanRoute
        ? findDailyPlan(parsed, planId)
        : resolvedPlans.find((item) => item.id === planId) ?? null;

      if (isDailyPlanRoute && JSON.stringify(parsed) !== JSON.stringify(resolvedPlans)) {
        await savePlans(resolvedPlans);
      }

      if (isDailyPlanRoute && !currentPlan) {
        router.replace("/planner");
        return;
      }

      setPlans(resolvedPlans);
      setPlan(currentPlan);
      setPlanName(currentPlan?.name || "");
      setLoaded(true);
    }

    void loadPlans();
  }, [planId, router]);

  async function save(updated: Plan[]) {
    const isDailyPlanRoute = isDailyPlanId(planId);
    const nextPlans = isDailyPlanRoute
      ? mergeDailyPlans(synchronizeDailyPlanSources(updated))
      : updated;

    await savePlans(nextPlans);
    setPlans(nextPlans);

    const found = nextPlans.find((item) => item.id === planId) || null;
    setPlan(found);
    setPlanName(found?.name || "");
  }

  function updatePlanTasks(updater: (tasks: PlanTask[]) => PlanTask[]) {
    const updated = plans.map((item) => {
      if (item.id !== planId) {
        return item;
      }

      return {
        ...item,
        tasks: updater(item.tasks),
      };
    });

    void save(updated);
  }

  function renamePlan() {
    if (!plan) {
      return;
    }

    const trimmedName = planName.trim();

    if (!trimmedName) {
      setPlanName(plan.name);
      return;
    }

    if (trimmedName === plan.name) {
      return;
    }

    const updated = plans.map((item) =>
      item.id === planId ? { ...item, name: trimmedName } : item
    );

    void save(updated);
  }

  function addTasks() {
    if (!input.trim()) {
      return;
    }

    const newTasks = input
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(createTask);

    updatePlanTasks((tasks) => [...tasks, ...newTasks]);
    setInput("");
  }

  function toggleTask(path: TaskPath) {
    updatePlanTasks((tasks) =>
      updateTaskAtPath(tasks, path, (task) => ({ ...task, done: !task.done }))
    );
  }

  function deleteTask(path: TaskPath) {
    setActiveTaskKey((current) => (current === pathToKey(path) ? null : current));
    setSubtaskDraftForKey((current) =>
      current === pathToKey(path) ? null : current
    );

    if (path.length === 1) {
      setMoveTaskIndex((current) => (current === path[0] ? null : current));
    }

    updatePlanTasks((tasks) => removeTaskAtPath(tasks, path));
  }

  function editTask(path: TaskPath) {
    if (!plan) {
      return;
    }

    const currentTask = getTaskAtPath(plan.tasks, path);

    if (!currentTask) {
      return;
    }

    const text = prompt("Edit task", currentTask.text);

    if (!text || !text.trim()) {
      return;
    }

    updatePlanTasks((tasks) =>
      updateTaskAtPath(tasks, path, (task) => ({
        ...task,
        versions: [...task.versions, task.text],
        text: text.trim(),
      }))
    );
  }

  function showHistory(path: TaskPath) {
    if (!plan) {
      return;
    }

    const currentTask = getTaskAtPath(plan.tasks, path);

    if (!currentTask) {
      return;
    }

    alert(currentTask.versions.join("\n") || "No history");
  }

  function updateTaskDeadline(path: TaskPath, deadline?: string) {
    updatePlanTasks((tasks) =>
      updateTaskAtPath(tasks, path, (task) => ({
        ...task,
        deadline,
      }))
    );
  }

  function openSubtaskDraft(path: TaskPath) {
    const key = pathToKey(path);
    setSubtaskDraftForKey((current) => (current === key ? null : key));
    setSubtaskDraftValue("");
  }

  function addSubtasks(path: TaskPath) {
    if (!subtaskDraftValue.trim()) {
      return;
    }

    const nextSubtasks = subtaskDraftValue
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(createTask);

    updatePlanTasks((tasks) =>
      updateTaskAtPath(tasks, path, (task) => ({
        ...task,
        subtasks: [...task.subtasks, ...nextSubtasks],
      }))
    );

    setSubtaskDraftForKey(null);
    setSubtaskDraftValue("");
  }

  function moveTo(targetId: string) {
    if (moveTaskIndex === null || !plan) {
      return;
    }

    const task = plan.tasks[moveTaskIndex];

    const updated = plans.map((item) => {
      if (item.id === planId) {
        return {
          ...item,
          tasks: item.tasks.filter((_, index) => index !== moveTaskIndex),
        };
      }

      if (item.id === targetId) {
        return {
          ...item,
          tasks: [...item.tasks, task],
        };
      }

      return item;
    });

    setMoveTaskIndex(null);
    setActiveTaskKey(null);
    void save(updated);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!plan) {
      return;
    }

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    const reordered = arrayMove(plan.tasks, oldIndex, newIndex);

    updatePlanTasks(() => reordered);
  }

  function sortTasksByDeadline() {
    if (!plan) {
      return;
    }

    const reordered = [...plan.tasks]
      .map((task, index) => ({ task, index }))
      .sort((a, b) => {
        if (a.task.done !== b.task.done) {
          return Number(a.task.done) - Number(b.task.done);
        }

        const deadlineDiff =
          getDeadlineSortValue(a.task.deadline) - getDeadlineSortValue(b.task.deadline);

        if (deadlineDiff !== 0) {
          return deadlineDiff;
        }

        return a.index - b.index;
      })
      .map(({ task }) => task);

    updatePlanTasks(() => reordered);
  }

  function sortSubtasksByDeadline(path: TaskPath) {
    updatePlanTasks((tasks) =>
      updateTaskAtPath(tasks, path, (task) => ({
        ...task,
        subtasks: [...task.subtasks]
          .map((subtask, index) => ({ subtask, index }))
          .sort((a, b) => {
            if (a.subtask.done !== b.subtask.done) {
              return Number(a.subtask.done) - Number(b.subtask.done);
            }

            const deadlineDiff =
              getDeadlineSortValue(a.subtask.deadline) -
              getDeadlineSortValue(b.subtask.deadline);

            if (deadlineDiff !== 0) {
              return deadlineDiff;
            }

            return a.index - b.index;
          })
          .map(({ subtask }) => subtask),
      }))
    );
  }

  if (!loaded) {
    return null;
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <Link href="/planner" className="text-sm text-gray-600">
          ← Назад
        </Link>

        <div className="mt-8 max-w-xl rounded-xl bg-white p-6 shadow">
          <h1 className="text-xl font-semibold">План не найден</h1>
          <p className="mt-2 text-sm text-gray-600">
            Этот план не удалось загрузить. Попробуйте вернуться в планировщик и
            пересобрать дневные планы.
          </p>
        </div>
      </main>
    );
  }

  const availableMoveTargets = plans.filter((item) => item.id !== planId);
  const periodLabel = formatPlanPeriod(plan);
  const indexedTasks = plan.tasks
    .map((task, originalIndex) => ({ task, originalIndex }))
    .filter(({ task }) => taskMatchesSearch(task, search));

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <Link href="/planner" className="text-sm text-gray-600">
        ← Назад
      </Link>

      <div className="mb-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={planName}
          onChange={(event) => setPlanName(event.target.value)}
          onBlur={renamePlan}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              renamePlan();
            }
          }}
          placeholder="Название плана"
          className="bg-white"
        />

        <Button type="button" onClick={renamePlan} variant="outline">
          Сохранить название
        </Button>
      </div>

      <div className="mb-4">
        <PlannerNotificationsButton />
      </div>

      {periodLabel ? (
        <p className="mb-4 text-sm text-gray-600">Период плана: {periodLabel}</p>
      ) : null}

      <div className="mb-3">
        <Button type="button" onClick={sortTasksByDeadline}>
          Сортировать задачи по дедлайну
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          placeholder="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-64 rounded border px-3 py-2"
        />
      </div>

      <div className="max-w-xl rounded-xl bg-white p-6 shadow">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={indexedTasks.map(({ originalIndex }) => originalIndex)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mb-6 space-y-4">
              {indexedTasks.map(({ task, originalIndex }) => (
                <SortableTaskTreeItem
                  key={task.id}
                  id={originalIndex}
                  task={task}
                  path={[originalIndex]}
                  level={0}
                  activeTaskKey={activeTaskKey}
                  setActiveTaskKey={setActiveTaskKey}
                  editTask={editTask}
                  showHistory={showHistory}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                  setMoveTaskIndex={setMoveTaskIndex}
                  moveOpen={moveTaskIndex === originalIndex}
                  moveTargets={availableMoveTargets}
                  moveTo={moveTo}
                  setDeadline={updateTaskDeadline}
                  cancelMove={() => setMoveTaskIndex(null)}
                  subtaskDraftForKey={subtaskDraftForKey}
                  subtaskDraftValue={subtaskDraftValue}
                  setSubtaskDraftValue={setSubtaskDraftValue}
                  openSubtaskDraft={openSubtaskDraft}
                  addSubtasks={addSubtasks}
                  sortSubtasksByDeadline={sortSubtasksByDeadline}
                  closeSubtaskDraft={() => {
                    setSubtaskDraftForKey(null);
                    setSubtaskDraftValue("");
                  }}
                  search={search}
                  sourcePlanName={getSourcePlanName(task.id, plans)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Вставьте список задач"
          className="mb-3 h-28 w-full rounded border px-3 py-2"
        />

        <button
          onClick={addTasks}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Добавить
        </button>
      </div>
    </main>
  );
}

function SortableTaskTreeItem({
  id,
  ...props
}: TaskTreeItemProps & { id: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskTreeItem
        {...props}
        dragHandle={(
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab px-2 text-gray-400 active:cursor-grabbing"
            title="Drag"
          >
            ⋮⋮
          </button>
        )}
      />
    </div>
  );
}

type TaskTreeItemProps = {
  task: PlanTask;
  path: TaskPath;
  level: number;
  activeTaskKey: string | null;
  setActiveTaskKey: (key: string | null) => void;
  editTask: (path: TaskPath) => void;
  showHistory: (path: TaskPath) => void;
  toggleTask: (path: TaskPath) => void;
  deleteTask: (path: TaskPath) => void;
  setMoveTaskIndex: (index: number | null) => void;
  moveOpen: boolean;
  moveTargets: Array<{ id: string; name: string }>;
  moveTo: (targetId: string) => void;
  setDeadline: (path: TaskPath, deadline?: string) => void;
  cancelMove: () => void;
  subtaskDraftForKey: string | null;
  subtaskDraftValue: string;
  setSubtaskDraftValue: (value: string) => void;
  openSubtaskDraft: (path: TaskPath) => void;
  addSubtasks: (path: TaskPath) => void;
  sortSubtasksByDeadline: (path: TaskPath) => void;
  closeSubtaskDraft: () => void;
  search: string;
  sourcePlanName?: string | null;
  dragHandle?: ReactNode;
};

function TaskTreeItem({
  task,
  path,
  level,
  activeTaskKey,
  setActiveTaskKey,
  editTask,
  showHistory,
  toggleTask,
  deleteTask,
  setMoveTaskIndex,
  moveOpen,
  moveTargets,
  moveTo,
  setDeadline,
  cancelMove,
  subtaskDraftForKey,
  subtaskDraftValue,
  setSubtaskDraftValue,
  openSubtaskDraft,
  addSubtasks,
  sortSubtasksByDeadline,
  closeSubtaskDraft,
  search,
  sourcePlanName,
  dragHandle,
}: TaskTreeItemProps) {
  const taskKey = pathToKey(path);
  const isActive = activeTaskKey === taskKey;
  const isSubtaskDraftOpen = subtaskDraftForKey === taskKey;
  const shouldShowTask = taskMatchesSearch(task, search);

  if (!shouldShowTask) {
    return null;
  }

  return (
    <div className={level > 0 ? "border-l border-gray-200 pl-4" : ""}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => toggleTask(path)}
          className={`mt-1 h-5 w-5 shrink-0 rounded-full border ${
            task.done ? "bg-black" : ""
          }`}
        />

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setActiveTaskKey(isActive ? null : taskKey)}
            className="w-full text-left"
          >
            <span className={task.done ? "line-through text-gray-400" : ""}>
              {task.text}
            </span>

            {sourcePlanName ? (
              <div className="mt-1 text-xs text-gray-500">
                Из плана: {sourcePlanName}
              </div>
            ) : null}

            {task.deadline ? (
              <div
                className={`mt-1 text-xs ${getTaskDeadlineTone(task.deadline, task.done)}`}
              >
                Дедлайн: {formatTaskDeadline(task.deadline)}
              </div>
            ) : null}
          </button>

          {isActive ? (
            <div className="mt-2">
              <div className="flex flex-wrap gap-4 text-sm">
                <button type="button" onClick={() => editTask(path)}>
                  Edit
                </button>

                <button type="button" onClick={() => showHistory(path)}>
                  History
                </button>

                <button type="button" onClick={() => openSubtaskDraft(path)}>
                  Добавить подзадачи
                </button>

                {task.subtasks.length > 1 ? (
                  <button type="button" onClick={() => sortSubtasksByDeadline(path)}>
                    Сортировать подзадачи по дедлайну
                  </button>
                ) : null}

                {level === 0 ? (
                  <button type="button" onClick={() => setMoveTaskIndex(path[0])}>
                    Move
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => deleteTask(path)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={task.deadline || ""}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const nextValue = event.target.value || undefined;
                    setDeadline(path, nextValue);
                  }}
                  className="rounded border px-3 py-1.5 text-sm"
                />

                {task.deadline ? (
                  <button
                    type="button"
                    onClick={() => setDeadline(path, undefined)}
                    className="text-sm text-gray-600"
                  >
                    Снять дедлайн
                  </button>
                ) : null}
              </div>

              {isSubtaskDraftOpen ? (
                <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                  <textarea
                    value={subtaskDraftValue}
                    onChange={(event) => setSubtaskDraftValue(event.target.value)}
                    placeholder="Впишите подзадачи, каждую с новой строки"
                    className="h-24 w-full rounded border px-3 py-2 text-sm"
                  />

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addSubtasks(path)}
                      className="rounded bg-black px-3 py-1.5 text-sm text-white"
                    >
                      Сохранить подзадачи
                    </button>

                    <button
                      type="button"
                      onClick={closeSubtaskDraft}
                      className="rounded border px-3 py-1.5 text-sm text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {level === 0 && moveOpen ? (
                <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    Move to:
                  </div>

                  {moveTargets.length === 0 ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-500">
                        Нет других планов, куда можно перенести задачу.
                      </p>
                      <button
                        type="button"
                        onClick={cancelMove}
                        className="text-sm text-gray-600"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {moveTargets.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => moveTo(plan.id)}
                          className="rounded bg-gray-200 px-3 py-1 text-sm transition hover:bg-gray-300"
                        >
                          {plan.name}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={cancelMove}
                        className="rounded border px-3 py-1 text-sm text-gray-600 transition hover:bg-white"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {task.subtasks.length > 0 ? (
            <div className="mt-3 space-y-3">
              {task.subtasks.map((subtask, index) => (
                <TaskTreeItem
                  key={subtask.id}
                  task={subtask}
                  path={[...path, index]}
                  level={level + 1}
                  activeTaskKey={activeTaskKey}
                  setActiveTaskKey={setActiveTaskKey}
                  editTask={editTask}
                  showHistory={showHistory}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                  setMoveTaskIndex={setMoveTaskIndex}
                  moveOpen={false}
                  moveTargets={moveTargets}
                  moveTo={moveTo}
                  setDeadline={setDeadline}
                  cancelMove={cancelMove}
                  subtaskDraftForKey={subtaskDraftForKey}
                  subtaskDraftValue={subtaskDraftValue}
                  setSubtaskDraftValue={setSubtaskDraftValue}
                  openSubtaskDraft={openSubtaskDraft}
                  addSubtasks={addSubtasks}
                  sortSubtasksByDeadline={sortSubtasksByDeadline}
                  closeSubtaskDraft={closeSubtaskDraft}
                  search={search}
                />
              ))}
            </div>
          ) : null}
        </div>

        {dragHandle}
      </div>
    </div>
  );
}
