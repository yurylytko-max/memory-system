"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type CollectionResult = {
  addedCount: number;
  totalCount: number;
};

export default function PlannerCompletedCollector() {
  const router = useRouter();
  const [isCollecting, setIsCollecting] = useState(false);
  const [status, setStatus] = useState("");

  async function collectCompletedTasks() {
    if (isCollecting) {
      return;
    }

    setIsCollecting(true);
    setStatus("");

    try {
      const response = await fetch("/api/planner/completed-tasks/collect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Не удалось собрать выполненные задачи.");
      }

      const result = (await response.json()) as CollectionResult;
      setStatus(
        result.addedCount === 0
          ? "Новых выполненных задач нет."
          : `Добавлено: ${result.addedCount}. Всего: ${result.totalCount}.`
      );
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Не удалось собрать выполненные задачи."
      );
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        type="button"
        onClick={() => {
          void collectCompletedTasks();
        }}
        disabled={isCollecting}
        data-testid="planner-collect-completed-button"
      >
        {isCollecting
          ? "Собираю..."
          : "Собрать список выполненных задач"}
      </Button>

      {status ? (
        <p
          className="text-xs text-gray-600"
          data-testid="planner-collect-completed-status"
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
