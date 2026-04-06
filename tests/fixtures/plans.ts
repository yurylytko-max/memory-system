import type { Plan } from "@/lib/plans";
import {
  DAILY_PLAN_FOLDER,
  DAILY_PLAN_ID_PREFIX,
} from "@/lib/planner-daily-plans";

export function createPlannerBasicFixture(): Plan[] {
  return [
    {
      id: "plan-life-home",
      name: "Дом",
      folder: "Личное",
      folderOrder: 0,
      tasks: [
        {
          id: "task-home-1",
          text: "Разобрать бумаги",
          done: false,
          versions: ["Разобрать бумаги"],
          subtasks: [],
        },
      ],
    },
  ];
}

export function createPlannerDailyFixture(): Plan[] {
  return [
    {
      id: "plan-work-main",
      name: "Рабочий план",
      folder: "Работа",
      folderOrder: 1,
      tasks: [
        {
          id: "task-work-parent",
          text: "Подготовить релиз",
          done: false,
          deadline: "2026-04-08",
          versions: ["Подготовить релиз"],
          subtasks: [
            {
              id: "task-work-sub-1",
              text: "Прогнать smoke",
              done: false,
              deadline: "2026-04-08",
              versions: ["Прогнать smoke"],
              subtasks: [],
            },
          ],
        },
      ],
    },
    {
      id: `${DAILY_PLAN_ID_PREFIX}2026-04-08`,
      name: "вторник, 8 апреля",
      folder: DAILY_PLAN_FOLDER,
      folderOrder: -1,
      periodStart: "2026-04-08",
      periodEnd: "2026-04-08",
      tasks: [
        {
          id: "manual-daily-note",
          text: "Ручная заметка дня",
          done: false,
          versions: [],
          subtasks: [],
        },
      ],
    },
  ];
}
