"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { formatVocabularyLabel, getStudyTextbook, type StudyLesson, type StudyTextbook } from "@/lib/study";

type Params = {
  id: string;
  lessonId: string;
};

export default function StudyLessonPage() {
  const params = useParams() as Params;
  const [textbook, setTextbook] = useState<StudyTextbook | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getStudyTextbook(params.id);
      setTextbook(data ?? null);
      setLoaded(true);
    }

    void load();
  }, [params.id]);

  const lesson = useMemo<StudyLesson | null>(() => {
    return textbook?.lessons.find((item) => item.id === params.lessonId) ?? null;
  }, [params.lessonId, textbook]);

  if (!loaded) {
    return <main className="p-10 text-slate-500">Загрузка урока...</main>;
  }

  if (!textbook || !lesson) {
    return <main className="p-10 text-slate-500">Урок не найден</main>;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/study/${textbook.id}`}
            className="inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-amber-50"
          >
            ← К учебнику
          </Link>
          <Link
            href={`/study/${textbook.id}/glossary?lessonId=${lesson.id}`}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Лексика урока
          </Link>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
            Урок {lesson.order}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{lesson.title}</h1>
          {lesson.topic ? <p className="mt-3 text-lg text-slate-600">{lesson.topic}</p> : null}
          {lesson.notes ? (
            <div className="mt-5 rounded-[24px] bg-amber-50 px-5 py-4">
              <div className="text-xs uppercase tracking-wide text-amber-700">Заметки</div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{lesson.notes}</div>
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-semibold text-slate-950">Грамматика</h2>
            <div className="mt-5 space-y-4">
              {lesson.grammar.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-10 text-center text-slate-500">
                  Грамматика пока не загружена
                </div>
              ) : (
                lesson.grammar.map((block) => (
                  <article key={block.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-950">{block.title}</h3>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {block.content}
                    </div>
                    {block.notes ? (
                      <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                        <span className="font-medium text-slate-900">Мои заметки:</span> {block.notes}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
              <h2 className="text-2xl font-semibold text-slate-950">Лексика</h2>
              <div className="mt-5 space-y-3">
                {lesson.vocabulary.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-10 text-center text-slate-500">
                    Лексика пока не загружена
                  </div>
                ) : (
                  lesson.vocabulary.map((entry) => (
                    <div key={entry.id} className="rounded-[24px] bg-slate-50 px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-base font-semibold text-slate-950">
                            {formatVocabularyLabel(entry)}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">{entry.translation}</div>
                        </div>
                        {entry.section ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
                            {entry.section}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
              <h2 className="text-2xl font-semibold text-slate-950">Чтение и упражнения</h2>
              <div className="mt-5 space-y-4">
                {lesson.sections.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-10 text-center text-slate-500">
                    Разделы урока пока не загружены
                  </div>
                ) : (
                  lesson.sections.map((section) => (
                    <article key={section.id} className="rounded-[24px] bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                          {section.type}
                        </span>
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {section.content}
                      </div>
                      {section.notes ? (
                        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                          <span className="font-medium text-slate-900">Мои заметки:</span> {section.notes}
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
