"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { BackButton } from "@/components/back-button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPlan,
  deletePlan,
  migrateLegacyPlansToServer,
  type Plan,
} from "@/lib/plans";

export default function Planner() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planName, setPlanName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [loaded, setLoaded] = useState(false);

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
      tasks: []
    };

    await createPlan(newPlan);
    setPlans((current) => [...current, newPlan]);

    setPlanName("");
  }

  async function handleDeletePlan(id: string) {
    await deletePlan(id);
    setPlans((current) => current.filter((plan) => plan.id !== id));
  }

  const folders = [...new Set(plans.map(p => p.folder))];

  return (
    <main className="min-h-screen bg-muted/40 p-10">

      <div className="max-w-5xl mx-auto">

        <BackButton
          fallbackHref="/"
          className="mb-6 text-sm text-muted-foreground hover:text-black"
        >
          ← Назад
        </BackButton>

        <h1 className="text-3xl font-bold mb-8">
          Планировщик
        </h1>

        <div className="flex gap-3 mb-10">

          <Input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Название плана"
          />

          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Папка"
          />

          <Button onClick={handleCreatePlan}>
            Создать
          </Button>

        </div>

        {!loaded ? (
          <div className="text-sm text-muted-foreground">Загрузка планов...</div>
        ) : folders.map(folder => (

          <div key={folder} className="mb-10">

            <h2 className="text-lg font-semibold mb-4">
              {folder}
            </h2>

            <div className="grid grid-cols-3 gap-4">

              {plans
                .filter(p => p.folder === folder)
                .map(plan => (

                  <Card key={plan.id} className="relative hover:shadow-md transition">

                    <CardHeader>

                      <Link href={`/planner/${plan.id}`}>
                        <CardTitle className="cursor-pointer text-base">
                          {plan.name}
                        </CardTitle>
                      </Link>

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

                ))}

            </div>

          </div>

        ))}

      </div>

    </main>
  );
}
