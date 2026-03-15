"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Task = {
  text: string;
  done: boolean;
  deadline?: string;
};

type Plan = {
  id: string;
  name: string;
  folder: string;
  tasks: Task[];
};

export default function Planner() {

  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [planName, setPlanName] = useState("");
  const [folderName, setFolderName] = useState("");

  useEffect(() => {

    const stored = localStorage.getItem("plans");

    if (stored) {
      setPlans(JSON.parse(stored));
    }

  }, []);

  function savePlans(updated: Plan[]) {
    localStorage.setItem("plans", JSON.stringify(updated));
    setPlans(updated);
  }

  function createPlan() {

    if (!planName.trim()) return;

    const newPlan: Plan = {
      id: Date.now().toString(),
      name: planName,
      folder: folderName || "Без папки",
      tasks: []
    };

    const updated = [...plans, newPlan];

    savePlans(updated);

    setPlanName("");
  }

  function deletePlan(id: string) {

    const updated = plans.filter(p => p.id !== id);

    savePlans(updated);
  }

  const folders = [...new Set(plans.map(p => p.folder))];

  return (
    <main className="min-h-screen bg-muted/40 p-10">

      <div className="max-w-5xl mx-auto">

        <button
          onClick={() => router.back()}
          className="mb-6 text-sm text-muted-foreground hover:text-black"
        >
          ← Назад
        </button>

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

          <Button onClick={createPlan}>
            Создать
          </Button>

        </div>

        {folders.map(folder => (

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
                        onClick={() => deletePlan(plan.id)}
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