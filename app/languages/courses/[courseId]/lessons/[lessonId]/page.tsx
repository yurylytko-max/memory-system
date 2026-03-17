"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { TutorPanel } from "@/components/languages/tutor-panel";
import type { LanguageCourse } from "@/lib/languages";

async function fetchJson<T>(input: RequestInfo): Promise<T> {
  const response = await fetch(input, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Request failed.");
  }

  return (await response.json()) as T;
}

export default function LanguageLessonPage() {
  const params = useParams() as { courseId: string; lessonId: string };
  const [course, setCourse] = useState<LanguageCourse | null>(null);

  useEffect(() => {
    void fetchJson<LanguageCourse>(`/api/languages/courses/${params.courseId}`)
      .then(setCourse)
      .catch(() => setCourse(null));
  }, [params.courseId]);

  const lesson = useMemo(
    () => course?.lessons.find((item) => item.id === params.lessonId) ?? null,
    [course, params.lessonId]
  );

  if (!course || !lesson) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-950">Lesson not found</h1>
          <Link href="/languages" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white">
            К курсам
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff3db_0%,#fff9ef_35%,#ffffff_72%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Link
          href={`/languages/courses/${course.id}`}
          className="inline-flex w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 transition hover:bg-orange-50"
        >
          ← К курсу
        </Link>

        <section className="rounded-[36px] border border-orange-200 bg-white p-8">
          <div className="text-sm uppercase tracking-[0.2em] text-orange-700">
            Lesson {lesson.number}
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {lesson.title}
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
            {lesson.summary}
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold text-slate-950">Lesson content</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {lesson.blocks.map((block, index) => (
                  <article
                    key={`${block.sourcePage}-${index}`}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {block.kind} · page {block.sourcePage}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-800">{block.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold text-slate-950">Exercises</h2>
              <div className="mt-6 grid gap-4">
                {lesson.exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {exercise.kind.replaceAll("_", " ")}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-900">{exercise.prompt}</p>
                    <p className="mt-2 text-sm text-slate-500">{exercise.instructions}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold text-slate-950">Glossary</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {lesson.glossary.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="text-lg font-semibold text-slate-950">{item.term}</div>
                    <div className="mt-2 text-sm text-slate-500">
                      {item.translation || item.partOfSpeech || "context word"}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{item.context}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <TutorPanel
            courseId={course.id}
            lessonId={lesson.id}
            title="Lesson tutor"
          />
        </div>
      </div>
    </main>
  );
}
