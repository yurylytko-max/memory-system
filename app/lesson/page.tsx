"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { BackButton } from "@/components/back-button";
import { getImportedCourse } from "@/lib/language-course";

export default function LessonIndexPage() {
  const course = useMemo(() => getImportedCourse(), []);
  const [search, setSearch] = useState("");

  const filteredLessons = useMemo(() => {
    if (!course) {
      return [];
    }

    const query = search.trim().toLowerCase();

    if (!query) {
      return course.lessons;
    }

    return course.lessons.filter((lesson) =>
      `${lesson.index} ${lesson.title}`.toLowerCase().includes(query)
    );
  }, [course, search]);

  if (!course) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_36%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <BackButton
            fallbackHref="/"
            className="inline-flex w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 shadow-sm transition hover:bg-orange-50"
          >
            ← Назад
          </BackButton>

          <div className="rounded-[32px] border border-orange-200 bg-white p-8 text-center shadow-[0_18px_50px_-35px_rgba(120,53,15,0.35)]">
            <h1 className="text-3xl font-semibold text-slate-950">
              Курс ещё не загружен
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Сначала импортируй учебник, потом здесь появятся уроки.
            </p>
            <Link
              href="/import"
              className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Открыть импорт
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_36%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <BackButton
          fallbackHref="/import"
          className="inline-flex w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 shadow-sm transition hover:bg-orange-50"
        >
          ← Назад
        </BackButton>

        <div className="rounded-[32px] border border-orange-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(120,53,15,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Уроки курса
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {course.sourceFileName} · уроков: {course.lessons.length}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти урок"
              className="h-12 w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredLessons.map((lesson) => (
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
      </div>
    </main>
  );
}
