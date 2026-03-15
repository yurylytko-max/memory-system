"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type Task = {
  text: string;
  done: boolean;
  versions: string[];
};

type Plan = {
  id: string;
  name: string;
  tasks: Task[];
};

export default function PlanPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [moveTaskIndex, setMoveTaskIndex] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("plans");
    if (!stored) return;

    const parsed = JSON.parse(stored) as Plan[];
    setPlans(parsed);

    const found = parsed.find((p) => p.id === planId) || null;
    setPlan(found);
  }, [planId]);

  function save(updated: Plan[]) {
    localStorage.setItem("plans", JSON.stringify(updated));
    setPlans(updated);

    const found = updated.find((p) => p.id === planId) || null;
    setPlan(found);
  }

  function addTasks() {
    if (!input.trim() || !plan) return;

    const lines = input
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const newTasks: Task[] = lines.map((text) => ({
      text,
      done: false,
      versions: [],
    }));

    const updated = plans.map((p) =>
      p.id === planId ? { ...p, tasks: [...p.tasks, ...newTasks] } : p
    );

    save(updated);
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

    save(updated);
  }

  function deleteTask(i: number) {
    if (!plan) return;

    const updated = plans.map((p) => {
      if (p.id !== planId) return p;
      return { ...p, tasks: p.tasks.filter((_, index) => index !== i) };
    });

    setActiveTask(null);
    setMoveTaskIndex(null);
    save(updated);
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

    save(updated);
  }

  function showHistory(i: number) {
    if (!plan) return;
    alert(plan.tasks[i].versions.join("\n") || "No history");
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
    save(updated);
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

    save(updated);
  }

  if (!plan) return null;

  const availableMoveTargets = plans.filter((p) => p.id !== planId);

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

      <h1 className="text-3xl font-bold mb-6">{plan.name}</h1>

      <input
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border px-3 py-2 rounded mb-6 w-64"
      />

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
  cancelMove,
}: {
  id: number;
  task: Task;
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
