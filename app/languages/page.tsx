"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LanguageCourse, LanguageImportJob } from "@/lib/languages";

async function fetchJson<T>(input: RequestInfo): Promise<T> {
  const response = await fetch(input, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Request failed.");
  }

  return (await response.json()) as T;
}

export default function LanguagesPage() {
  const [courses, setCourses] = useState<LanguageCourse[]>([]);
  const [jobs, setJobs] = useState<LanguageImportJob[]>([]);

  useEffect(() => {
    void Promise.all([
      fetchJson<LanguageCourse[]>("/api/languages/courses").catch(() => []),
      fetchJson<LanguageImportJob[]>("/api/languages/import-jobs").catch(() => []),
    ]).then(([nextCourses, nextJobs]) => {
      setCourses(nextCourses);
      setJobs(nextJobs);
    });
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff3db_0%,#fff9ef_35%,#ffffff_72%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[36px] border border-orange-200 bg-white/90 p-8 shadow-[0_18px_60px_-40px_rgba(120,53,15,0.38)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-sm font-medium uppercase tracking-[0.2em] text-orange-700">
                Изучение языков
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                AI-native workspace для учебников, уроков и tutor chat
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Здесь учебник превращается в структуру курса, а AI tutor умеет
                объяснять грамматику, перевод и упражнения в контексте урока.
              </p>
            </div>

            <Link
              href="/languages/import"
              className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Импортировать учебник
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">Курсов</div>
            <div className="mt-3 text-4xl font-semibold text-slate-950">
              {courses.length}
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">Import jobs</div>
            <div className="mt-3 text-4xl font-semibold text-slate-950">
              {jobs.length}
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">AI tutor</div>
            <div className="mt-3 text-sm leading-6 text-slate-700">
              Встроен в course и lesson pages, чтобы разбирать грамматику и
              задавать вопросы по материалу.
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">Курсы</h2>
            <Link
              href="/languages/import"
              className="text-sm font-medium text-orange-700 hover:text-orange-800"
            >
              Новый import
            </Link>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/languages/courses/${course.id}`}
                className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="text-sm font-medium text-orange-700">
                  {course.lessonCount} lessons
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                  {course.title}
                </h3>
                <p className="mt-3 text-sm text-slate-500">{course.sourceFileName}</p>
              </Link>
            ))}

            {courses.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-500">
                Пока нет курсов.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
