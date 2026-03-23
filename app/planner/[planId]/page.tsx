"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ChangeEvent } from "react";

import Link from "next/link";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
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
  return deadline ? Date.parse(`${deadline}T00:00:00`) : Number.POSITIVE_INFINITY;
}

export default function PlanPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [planName, setPlanName] = useState("");
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [moveTaskIndex, setMoveTaskIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      const parsed = await migrateLegacyPlansToServer();
      const currentPlan = parsed.find((p) => p.id === planId) || null;

      setPlans(parsed);
      setPlan(currentPlan);
      setPlanName(currentPlan?.name || "");
      setLoaded(true);
    }

    void loadPlans();
  }, [planId]);

  async function save(updated: Plan[]) {
    await savePlans(updated);
    setPlans(updated);

    const found = updated.find((p) => p.id === planId) || null;
    setPlan(found);
    setPlanName(found?.name || "");
  }

  function renamePlan() {
    if (!plan) return;

    const trimmedName = planName.trim();
    if (!trimmedName) {
      setPlanName(plan.name);
      return;
    }

    if (trimmedName === plan.name) {
      return;
    }

    const updated = plans.map((p) =>
      p.id === planId ? { ...p, name: trimmedName } : p
    );

    void save(updated);
  }

  function addTasks() {
    if (!input.trim() || !plan) return;

    const lines = input
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const newTasks: PlanTask[] = lines.map((text) => ({
      id: crypto.randomUUID(),
      text,
      done: false,
      versions: [],
    }));

    const updated = plans.map((p) =>
      p.id === planId ? { ...p, tasks: [...p.tasks, ...newTasks] } : p
    );

    void save(updated);
    setInput("");
  }

  function toggleTask(i: number) {
    if (!plan) return;

    const updated = plans.map((p) => {
      if (p.id !== planId) return p;

      const tasks = [...p.tasks];
      tasks[i] = { ...tasks[i], done: !tasks[i].done };

      return { ...p, tasks };
    });

    void save(updated);
  }

  function deleteTask(i: number) {
    if (!plan) return;

    const updated = plans.map((p) => {
      if (p.id !== planId) return p;
      return { ...p, tasks: p.tasks.filter((_, index) => index !== i) };
    });

    setActiveTask(null);
    setMoveTaskIndex(null);
    void save(updated);
  }

  function editTask(i: number) {
    if (!plan) return;

    const text = prompt("Edit task", plan.tasks[i].text);
    if (!text || !text.trim()) return;

    const updated = plans.map((p) => {
      if (p.id !== planId) return p;

      const tasks = [...p.tasks];
      tasks[i] = {
        ...tasks[i],
        versions: [...tasks[i].versions, tasks[i].text],
        text: text.trim(),
      };

      return { ...p, tasks };
    });

    void save(updated);
  }

  function showHistory(i: number) {
    if (!plan) return;
    alert(plan.tasks[i].versions.join("\n") || "No history");
  }

  function updateTaskDeadline(i: number, deadline?: string) {
    if (!plan) return;

    const updated = plans.map((p) => {
      if (p.id !== planId) return p;

      const tasks = [...p.tasks];
      tasks[i] = {
        ...tasks[i],
        deadline,
      };

      return { ...p, tasks };
    });

    void save(updated);
  }

  function moveTo(targetId: string) {
    if (moveTaskIndex === null || !plan) return;

    const task = plan.tasks[moveTaskIndex];

    const updated = plans.map((p) => {
      if (p.id === planId) {
        return {
          ...p,
          tasks: p.tasks.filter((_, i) => i !== moveTaskIndex),
        };
      }

      if (p.id === targetId) {
        return {
          ...p,
          tasks: [...p.tasks, task],
        };
      }

      return p;
    });

    setMoveTaskIndex(null);
    setActiveTask(null);
    void save(updated);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!plan) return;

    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);

    const reordered = arrayMove(plan.tasks, oldIndex, newIndex);

    const updated = plans.map((p) =>
      p.id === planId ? { ...p, tasks: reordered } : p
    );

    void save(updated);
  }

  function sortTasksByDeadline() {
    if (!plan) return;

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

    const updated = plans.map((p) =>
      p.id === planId ? { ...p, tasks: reordered } : p
    );

    void save(updated);
  }

  if (!loaded) return null;
  if (!plan) return null;

  const availableMoveTargets = plans.filter((p) => p.id !== planId);
  const periodLabel = formatPlanPeriod(plan);

  const indexedTasks = plan.tasks
    .map((task, originalIndex) => ({ task, originalIndex }))
    .filter(({ task }) =>
      task.text.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <Link href="/planner" className="text-sm text-gray-600">
        ← Назад
      </Link>

      <div className="mb-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          onBlur={renamePlan}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
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
        <p className="mb-4 text-sm text-gray-600">
          Период плана: {periodLabel}
        </p>
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
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded border px-3 py-2"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow max-w-xl">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={indexedTasks.map(({ originalIndex }) => originalIndex)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4 mb-6">
              {indexedTasks.map(({ task, originalIndex }) => (
                <SortableTask
                  key={originalIndex}
                  id={originalIndex}
                  task={task}
                  active={activeTask === originalIndex}
                  open={() =>
                    setActiveTask(activeTask === originalIndex ? null : originalIndex)
                  }
                  toggle={() => toggleTask(originalIndex)}
                  edit={() => editTask(originalIndex)}
                  history={() => showHistory(originalIndex)}
                  move={() => setMoveTaskIndex(originalIndex)}
                  moveOpen={moveTaskIndex === originalIndex}
                  moveTargets={availableMoveTargets}
                  moveTo={(targetId) => moveTo(targetId)}
                  setDeadline={(deadline) => updateTaskDeadline(originalIndex, deadline)}
                  cancelMove={() => setMoveTaskIndex(null)}
                  deleteTask={() => deleteTask(originalIndex)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Вставьте список задач"
          className="border rounded px-3 py-2 w-full h-28 mb-3"
        />

        <button
          onClick={addTasks}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Добавить
        </button>
      </div>
    </main>
  );
}

function SortableTask({
  id,
  task,
  toggle,
  active,
  open,
  edit,
  history,
  deleteTask,
  move,
  moveOpen,
  moveTargets,
  moveTo,
  setDeadline,
  cancelMove,
}: {
  id: number;
  task: PlanTask;
  toggle: () => void;
  active: boolean;
  open: () => void;
  edit: () => void;
  history: () => void;
  deleteTask: () => void;
  move: () => void;
  moveOpen: boolean;
  moveTargets: Array<{ id: string; name: string }>;
  moveTo: (targetId: string) => void;
  setDeadline: (deadline?: string) => void;
  cancelMove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className={`w-5 h-5 rounded-full border shrink-0 ${
            task.done ? "bg-black" : ""
          }`}
        />

        <button
          type="button"
          onClick={open}
          className="text-left flex-1"
        >
          <span className={task.done ? "line-through text-gray-400" : ""}>
            {task.text}
          </span>

          {task.deadline ? (
            <div className={`mt-1 text-xs ${getTaskDeadlineTone(task.deadline, task.done)}`}>
              Дедлайн: {formatTaskDeadline(task.deadline)}
            </div>
          ) : null}
        </button>

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-gray-400 px-2 cursor-grab active:cursor-grabbing"
          title="Drag"
        >
          ⋮⋮
        </button>
      </div>

      {active && (
        <div className="ml-8 mt-2">
          <div className="flex gap-4 text-sm">
            <button type="button" onClick={edit}>
              Edit
            </button>

            <button type="button" onClick={history}>
              History
            </button>

            <button type="button" onClick={move}>
              Move
            </button>

            <button type="button" onClick={deleteTask} className="text-red-500">
              Delete
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={task.deadline || ""}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const nextValue = event.target.value || undefined;
                setDeadline(nextValue);
              }}
              className="rounded border px-3 py-1.5 text-sm"
            />

            {task.deadline ? (
              <button
                type="button"
                onClick={() => setDeadline(undefined)}
                className="text-sm text-gray-600"
              >
                Снять дедлайн
              </button>
            ) : null}
          </div>

          {moveOpen && (
            <div className="mt-3 rounded-lg border bg-gray-50 p-3">
              <div className="mb-2 text-sm font-medium text-gray-700">Move to:</div>

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
          )}
        </div>
      )}
    </div>
  );
}
