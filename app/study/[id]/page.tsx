"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { buildReviewQueue, countDueCards, flattenGlossary, getStudyTextbook, type StudyTextbook } from "@/lib/study";

type Params = {
  id: string;
};

export default function StudyTextbookPage() {
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

  const stats = useMemo(() => {
    if (!textbook) {
      return null;
    }

    return {
      lessons: textbook.lessons.length,
      glossary: flattenGlossary(textbook).length,
      due: countDueCards(textbook),
      learning: buildReviewQueue(textbook, "learn").length,
    };
  }, [textbook]);

  if (!loaded) {
    return <main className="p-10 text-slate-500">Загрузка учебника...</main>;
  }

  if (!textbook || !stats) {
    return <main className="p-10 text-slate-500">Учебник не найден</main>;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_24%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Link
          href="/study"
          className="inline-flex w-fit rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-amber-50"
        >
          ← К учебникам
        </Link>

        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
                {textbook.languageCode.toUpperCase()}
                {textbook.level ? ` · ${textbook.level}` : ""}
                {textbook.series ? ` · ${textbook.series}` : ""}
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                {textbook.title}
              </h1>
              {textbook.notes ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {textbook.notes}
                </p>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Заметки к учебнику можно использовать как место для общего плана, проблемных тем и маркеров серии.
                </p>
              )}
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-amber-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-amber-700">Уроки</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{stats.lessons}</div>
              </div>
              <div className="rounded-[24px] bg-amber-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-amber-700">Лексика</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{stats.glossary}</div>
              </div>
              <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white">
                <div className="text-xs uppercase tracking-wide text-slate-300">Изучение</div>
                <div className="mt-1 text-2xl font-semibold">{stats.learning}</div>
              </div>
              <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white">
                <div className="text-xs uppercase tracking-wide text-slate-300">Повторить</div>
                <div className="mt-1 text-2xl font-semibold">{stats.due}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/study/${textbook.id}/glossary`}
              className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Открыть глоссарий
            </Link>
            <Link
              href={`/study/${textbook.id}/review?mode=learn`}
              className="inline-flex h-11 items-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Режим изучения
            </Link>
            <Link
              href={`/study/${textbook.id}/review?mode=review`}
              className="inline-flex h-11 items-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Режим повторения
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Уроки</h2>
              <p className="text-sm text-slate-500">
                Каждый урок содержит грамматику, лексику, чтение и упражнения без привязки к ИИ.
              </p>
            </div>
          </div>

          {textbook.lessons.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500">
              В учебнике пока нет уроков. Их можно загрузить импортом JSON.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {textbook.lessons
                .slice()
                .sort((left, right) => left.order - right.order)
                .map((lesson) => (
                  <article key={lesson.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-amber-700">Урок {lesson.order}</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-950">{lesson.title}</h3>
                        {lesson.topic ? (
                          <p className="mt-2 text-sm text-slate-600">{lesson.topic}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {lesson.vocabulary.length} слов
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Грамматика</div>
                        <div className="mt-1 font-semibold text-slate-950">{lesson.grammar.length}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Лексика</div>
                        <div className="mt-1 font-semibold text-slate-950">{lesson.vocabulary.length}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Разделы</div>
                        <div className="mt-1 font-semibold text-slate-950">{lesson.sections.length}</div>
                      </div>
                    </div>

                    <Link
                      href={`/study/${textbook.id}/lessons/${lesson.id}`}
                      className="mt-5 inline-flex text-sm font-medium text-slate-950 hover:text-slate-600"
                    >
                      Открыть урок →
                    </Link>
                  </article>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
