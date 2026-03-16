"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BackButton } from "@/components/back-button";
import {
  clearImportedCourse,
  getImportedCourse,
  parseImportedCourse,
  saveImportedCourse,
  type ImportedPage,
} from "@/lib/language-course";

type PdfTextItem = {
  str: string;
  transform: number[];
  width?: number;
};

function pageItemsToText(items: PdfTextItem[]) {
  const rows = new Map<number, PdfTextItem[]>();

  for (const item of items) {
    const y = Math.round(item.transform[5]);
    const existingRow = Array.from(rows.keys()).find(
      (rowY) => Math.abs(rowY - y) <= 2
    );
    const key = existingRow ?? y;
    const row = rows.get(key) ?? [];

    row.push(item);
    rows.set(key, row);
  }

  return Array.from(rows.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([, row]) =>
      row
        .sort((left, right) => left.transform[4] - right.transform[4])
        .map((item) => item.str.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

export default function ImportPage() {
  const router = useRouter();
  const existingCourse = useMemo(() => getImportedCourse(), []);
  const [course, setCourse] = useState(existingCourse);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setStatus("Читаю PDF и собираю уроки...");

    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise;

      const pages: ImportedPage[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();

        pages.push({
          pageNumber,
          text: pageItemsToText(content.items as PdfTextItem[]),
        });
      }

      const parsedCourse = parseImportedCourse(pages, file.name);

      saveImportedCourse(parsedCourse);
      setCourse(parsedCourse);
      setStatus(`Готово: найдено уроков ${parsedCourse.lessons.length}.`);
      router.push("/lesson");
    } catch (error) {
      console.error(error);
      setStatus("Не удалось разобрать PDF.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    clearImportedCourse();
    setCourse(null);
    setStatus("Импортированный курс очищен.");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_36%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <BackButton
          fallbackHref="/"
          className="inline-flex w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 shadow-sm transition hover:bg-orange-50"
        >
          ← Назад
        </BackButton>

        <div className="rounded-[32px] border border-orange-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(120,53,15,0.35)] backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Языковая среда
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Загрузи PDF учебника. Я разберу его на уроки, подготовлю
            автогенерируемые упражнения и глоссарий уроков с карточками.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFile}
                className="hidden"
                disabled={loading}
              />
              {loading ? "Обрабатываю PDF..." : "Загрузить учебник"}
            </label>

            {course && (
              <>
                <Link
                  href="/lesson"
                  className="inline-flex items-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Открыть уроки
                </Link>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center rounded-2xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Очистить импорт
                </button>
              </>
            )}
          </div>

          {status && (
            <p className="mt-4 text-sm text-slate-600">
              {status}
            </p>
          )}
        </div>

        {course ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {course.lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lesson/${lesson.id}`}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-35px_rgba(15,23,42,0.45)]"
              >
                <div className="text-sm font-medium text-orange-700">
                  Урок {lesson.index}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  {lesson.title}
                </h2>
                <div className="mt-4 space-y-1 text-sm text-slate-500">
                  <div>
                    страницы: {lesson.pageStart}-{lesson.pageEnd}
                  </div>
                  <div>
                    упражнений: {lesson.exercises.length}
                  </div>
                  <div>
                    карточек словаря: {lesson.glossary.length}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-orange-200 bg-white/80 px-6 py-16 text-center text-slate-500 shadow-sm">
            Учебник ещё не загружен.
          </div>
        )}
      </div>
    </main>
  );
}
