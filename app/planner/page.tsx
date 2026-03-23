"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DateRange } from "react-day-picker";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPlan,
  deletePlan,
  migrateLegacyPlansToServer,
  savePlans,
  type Plan,
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

function toDate(date?: string) {
  return date ? new Date(`${date}T00:00:00`) : undefined;
}

function toIsoDate(date?: Date) {
  if (!date) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Planner() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planName, setPlanName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingFolder, setEditingFolder] = useState("");
  const [editingRange, setEditingRange] = useState<DateRange | undefined>();

  useEffect(() => {
    async function loadPlans() {
      const data = await migrateLegacyPlansToServer();

      setPlans(data);
      setLoaded(true);
    }

    void loadPlans();
  }, []);
  async function handleCreatePlan() {

    if (!planName.trim()) return;

    const newPlan: Plan = {
      id: Date.now().toString(),
      name: planName,
      folder: folderName || "Без папки",
      periodStart: undefined,
      periodEnd: undefined,
      tasks: []
    };

    await createPlan(newPlan);
    setPlans((current) => [...current, newPlan]);

    setPlanName("");
  }

  async function handleDeletePlan(id: string) {
    const currentPlan = plans.find((plan) => plan.id === id);

    if (!currentPlan) {
      return;
    }

    const confirmed = window.confirm(
      `Удалить план "${currentPlan.name}"? Задачи внутри тоже будут удалены.`
    );

    if (!confirmed) {
      return;
    }

    await deletePlan(id);
    setPlans((current) => current.filter((plan) => plan.id !== id));
  }

  function openEditDialog(plan: Plan) {
    setEditingPlan(plan);
    setEditingName(plan.name);
    setEditingFolder(plan.folder);
    setEditingRange({
      from: toDate(plan.periodStart),
      to: toDate(plan.periodEnd),
    });
  }

  function closeEditDialog() {
    setEditingPlan(null);
    setEditingName("");
    setEditingFolder("");
    setEditingRange(undefined);
  }

  async function handleSavePlanChanges() {
    if (!editingPlan) {
      return;
    }

    const trimmedName = editingName.trim();
    const trimmedFolder = editingFolder.trim();

    if (!trimmedName) {
      return;
    }

    const updatedPlan: Plan = {
      ...editingPlan,
      name: trimmedName,
      folder: trimmedFolder || "Без папки",
      periodStart: toIsoDate(editingRange?.from),
      periodEnd: toIsoDate(editingRange?.to),
    };

    const updatedPlans = plans.map((plan) =>
      plan.id === editingPlan.id ? updatedPlan : plan
    );

    await createOrUpdatePlans(updatedPlans);
    closeEditDialog();
  }

  async function handleDeleteFromDialog() {
    if (!editingPlan) {
      return;
    }

    const planIdToDelete = editingPlan.id;
    closeEditDialog();
    await handleDeletePlan(planIdToDelete);
  }

  async function createOrUpdatePlans(updatedPlans: Plan[]) {
    await savePlans(updatedPlans);
    setPlans(updatedPlans);
  }

  const folders = [...new Set(plans.map(p => p.folder))];

  return (
    <main className="min-h-screen overflow-x-hidden bg-muted/40 px-4 py-10 sm:px-6 lg:px-10">

      <div className="mx-auto max-w-7xl">

        <Link
          href="/"
          className="mb-6 text-sm text-muted-foreground hover:text-black"
        >
          ← Назад
        </Link>

        <h1 className="text-3xl font-bold mb-8">
          Планировщик
        </h1>

        <div className="mb-10 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">

          <Input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Название плана"
            className="h-10"
          />

          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Папка"
            className="h-10"
          />

          <Button onClick={handleCreatePlan} className="h-10 xl:px-6">
            Создать
          </Button>

        </div>

        {!loaded ? (
          <div className="text-sm text-muted-foreground">Загрузка планов...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {folders.map((folder) => (
              <section
                key={folder}
                className="min-w-0 rounded-2xl border bg-white/70 p-4 shadow-sm"
              >
                <h2 className="mb-4 text-lg font-semibold">
                  {folder}
                </h2>

                <div className="space-y-4">
                  {plans
                    .filter((p) => p.folder === folder)
                    .map((plan) => {
                      const periodLabel = formatPlanPeriod(plan);

                      return (
                      <Card key={plan.id} className="relative min-w-0 hover:shadow-md transition">
                        <CardHeader>
                          <Link href={`/planner/${plan.id}`}>
                            <CardTitle className="cursor-pointer break-words pr-8 text-base">
                              {plan.name}
                            </CardTitle>
                          </Link>

                          {periodLabel ? (
                            <p className="text-xs text-muted-foreground">
                              {periodLabel}
                            </p>
                          ) : null}

                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(plan)}
                            >
                              Редактировать
                            </Button>
                          </div>

                          <button
                            onClick={() => {
                              void handleDeletePlan(plan.id);
                            }}
                            className="absolute top-3 right-4 text-muted-foreground hover:text-red-500"
                          >
                            ×
                          </button>
                        </CardHeader>
                      </Card>
                    );
                    })}
                </div>
              </section>
            ))}
          </div>
        )}

      </div>

      <Dialog open={Boolean(editingPlan)} onOpenChange={(open) => {
        if (!open) {
          closeEditDialog();
        }
      }}>
        <DialogContent className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Редактировать план</DialogTitle>
            <DialogDescription>
              Можно изменить название, папку и период всего плана. Дедлайны у отдельных задач останутся отдельными.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Название</label>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Название плана"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Папка</label>
              <Input
                value={editingFolder}
                onChange={(e) => setEditingFolder(e.target.value)}
                placeholder="Папка"
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Период плана</div>
                <div className="text-xs text-muted-foreground">
                  Выберите диапазон дат для всего плана.
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingRange(undefined)}
              >
                Очистить период
              </Button>
            </div>

            <div className="rounded-xl border p-3">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={editingRange}
                onSelect={setEditingRange}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void handleDeleteFromDialog();
              }}
            >
              Удалить план
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                Отмена
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleSavePlanChanges();
                }}
              >
                Сохранить
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}
