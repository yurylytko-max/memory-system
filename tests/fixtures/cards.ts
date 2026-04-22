import type { Card } from "@/lib/cards";

export function createCardsWorkspaceFixture(): Card[] {
  return [
    {
      id: "card-life-1",
      title: "Личная заметка",
      content: "Сходить к врачу",
      source: "",
      type: "thought",
      sphere: "Здоровье",
      tags: ["здоровье", "важно"],
      image: null,
      workspace: "life",
    },
    {
      id: "card-work-1",
      title: "Рабочая статья",
      content: "Рефакторинг тестового контура",
      source: "ADR",
      type: "article",
      sphere: "Инженерия",
      tags: ["архитектура", "важно"],
      image: null,
      workspace: "work",
    },
    {
      id: "card-study-1",
      title: "Учебный чек-лист",
      content: "Повторить лексику\nСделать упражнение",
      contentType: "checklist",
      checklist: [
        {
          id: "study-checklist-1",
          text: "Повторить лексику",
          checked: false,
        },
        {
          id: "study-checklist-2",
          text: "Сделать упражнение",
          checked: true,
        },
      ],
      source: "Schritte",
      type: "thought",
      sphere: "Немецкий",
      tags: ["учёба", "немецкий"],
      image: null,
      workspace: "study",
    },
    {
      id: "card-life-legacy",
      title: "Legacy card",
      content: "Без workspace в исходных данных",
      source: "",
      type: "quote",
      sphere: "Архив",
      tags: ["legacy"],
      image: null,
      workspace: "life",
    },
  ];
}
