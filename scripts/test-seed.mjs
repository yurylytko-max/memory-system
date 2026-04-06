import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const testDataRoot = resolve(process.cwd(), process.env.TEST_DATA_ROOT ?? ".test-data");

async function ensureRoot() {
  await rm(testDataRoot, { recursive: true, force: true });
  await mkdir(testDataRoot, { recursive: true });
}

async function writeJson(relativePath, value) {
  const absolutePath = join(testDataRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, JSON.stringify(value, null, 2), "utf8");
}

await ensureRoot();

await Promise.all([
  writeJson("plans-db.json", [
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
  ]),
  writeJson("cards-db.json", [
    {
      id: "card-life-1",
      title: "Личная заметка",
      content: "Сходить к врачу",
      source: "",
      type: "thought",
      sphere: "Здоровье",
      tags: ["здоровье", "важно"],
      image: null,
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
  ]),
  writeJson("texts-db.json", [
    {
      id: "text-1",
      title: "Тестовый текст",
      content: "Содержимое текста",
      tag: "draft",
      createdAt: "2026-04-05T12:00:00.000Z",
      updatedAt: "2026-04-05T12:00:00.000Z",
    },
  ]),
  writeJson("study-3/books.json", [
    {
      id: "study-book-1",
      title: "Test German Book",
      file_name: "german-book.pdf",
      mime_type: "application/pdf",
      page_count: 3,
      file_url: "https://example.invalid/german-book.pdf",
      storage: "blob",
      created_at: "2026-04-05T12:00:00.000Z",
      updated_at: "2026-04-05T12:00:00.000Z",
    },
  ]),
]);

await mkdir(join(testDataRoot, "study-3", "books", "study-book-1"), {
  recursive: true,
});
await writeFile(
  join(testDataRoot, "study-3", "books", "study-book-1", "page-1.html"),
  "<article>Hallo Welt</article>",
  "utf8"
);
