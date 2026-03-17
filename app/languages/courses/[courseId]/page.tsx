"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function LanguageCoursePage() {
  const params = useParams() as { courseId: string };
  const [course, setCourse] = useState<LanguageCourse | null>(null);

  useEffect(() => {
    void fetchJson<LanguageCourse>(`/api/languages/courses/${params.courseId}`)
      .then(setCourse)
      .catch(() => setCourse(null));
  }, [params.courseId]);

  if (!course) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-950">Course not found</h1>
          <Link href="/languages" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white">
            К курсам
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff3db_0%,#fff9ef_35%,#ffffff_72%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Link
          href="/languages"
          className="inline-flex w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 transition hover:bg-orange-50"
        >
          ← Все курсы
        </Link>

        <section className="rounded-[36px] border border-orange-200 bg-white p-8">
          <div className="text-sm uppercase tracking-[0.2em] text-orange-700">
            Course
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {course.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {course.lessonCount} lessons · {course.totalPages} pages · source:{" "}
            {course.sourceFileName}
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-semibold text-slate-950">Lessons</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {course.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/languages/courses/${course.id}/lessons/${lesson.id}`}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="text-sm font-medium text-orange-700">
                    Lesson {lesson.number}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">
                    {lesson.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {lesson.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <TutorPanel courseId={course.id} title="Course tutor" />
        </div>
      </div>
    </main>
  );
}
