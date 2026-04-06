import type { TextDocument } from "@/lib/texts";

export function createTextsFixture(): TextDocument[] {
  return [
    {
      id: "text-1",
      title: "Тестовый текст",
      content: "Содержимое текста",
      tag: "draft",
      createdAt: "2026-04-05T12:00:00.000Z",
      updatedAt: "2026-04-05T12:00:00.000Z",
    },
  ];
}
