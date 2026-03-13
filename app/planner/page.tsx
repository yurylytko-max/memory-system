"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    <main className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-3xl font-bold mb-8">
        Планировщик
      </h1>

      <div className="flex gap-3 mb-10">

        <input
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="Название плана"
          className="border rounded px-3 py-2"
        />

        <input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Папка"
          className="border rounded px-3 py-2"
        />

        <button
          onClick={createPlan}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Создать
        </button>

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

                <div
                  key={plan.id}
                  className="bg-white p-6 rounded-xl shadow relative"
                >

                  <Link href={`/planner/${plan.id}`}>
                    <div className="cursor-pointer font-medium">
                      {plan.name}
                    </div>
                  </Link>

                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="absolute top-2 right-3 text-gray-400"
                  >
                    ×
                  </button>

                </div>

              ))}

          </div>

        </div>

      ))}

    </main>
  );
}