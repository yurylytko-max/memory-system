"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { flattenGlossary, formatVocabularyLabel, getStudyTextbook, type StudyTextbook } from "@/lib/study";

type Params = {
  id: string;
};

export default function StudyGlossaryPage() {
  const params = useParams() as Params;
  const searchParams = useSearchParams();
  const lessonFilter = searchParams.get("lessonId") ?? "all";
  const [textbook, setTextbook] = useState<StudyTextbook | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "cards">("list");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      const data = await getStudyTextbook(params.id);
      setTextbook(data ?? null);
      setLoaded(true);
    }

    void load();
  }, [params.id]);

  const glossary = useMemo(() => {
    if (!textbook) {
      return [];
    }

    return flattenGlossary(textbook).filter((item) => {
      const lessonMatch = lessonFilter === "all" || item.lessonId === lessonFilter;
      const haystack =
        `${item.entry.de} ${item.entry.ru} ${item.entry.article ?? ""} ${item.entry.sectionType ?? ""} ${(item.entry.tags ?? []).join(" ")}`.toLowerCase();
      const searchMatch = haystack.includes(search.toLowerCase());
      return lessonMatch && searchMatch;
    });
  }, [lessonFilter, search, textbook]);

  if (!loaded) {
    return <main className="p-10 text-slate-500">Загрузка глоссария...</main>;
  }

  if (!textbook) {
    return <main className="p-10 text-slate-500">Учебник не найден</main>;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/study/${textbook.id}`}
            className="inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-amber-50"
          >
            ← К учебнику
          </Link>
          <Link
            href={`/study/${textbook.id}/review`}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Карточки
          </Link>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">Glossary</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                {textbook.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Общий и уроковый словарь. Можно смотреть списком или карточками-перевёртышами.
              </p>
            </div>

            <div className="flex rounded-full border border-slate-300 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${view === "list" ? "bg-slate-950 text-white" : "text-slate-600"}`}
              >
                Список
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${view === "cards" ? "bg-slate-950 text-white" : "text-slate-600"}`}
              >
                Карточки
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по слову, переводу, тегу или блоку"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
            <select
              value={lessonFilter}
              onChange={() => {
                // Intentionally handled with links below.
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none"
              disabled
            >
              <option>{lessonFilter === "all" ? "Все уроки" : "Фильтр урока из URL"}</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/study/${textbook.id}/glossary`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${lessonFilter === "all" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              Все уроки
            </Link>
            {textbook.lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/study/${textbook.id}/glossary?lessonId=${lesson.id}`}
                className={`rounded-full px-4 py-2 text-sm font-medium ${lessonFilter === lesson.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {lesson.order}
              </Link>
            ))}
          </div>
        </section>

        {view === "list" ? (
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
            <div className="space-y-3">
              {glossary.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500">
                  По текущему фильтру слов нет
                </div>
              ) : (
                glossary.map((item) => (
                  <article
                    key={`${item.lessonId}-${item.entry.id}`}
                    className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_140px]"
                  >
                    <div>
                      <div className="text-base font-semibold text-slate-950">
                        {formatVocabularyLabel(item.entry)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{item.lessonTitle}</div>
                    </div>
                    <div className="text-sm text-slate-700">{item.entry.ru}</div>
                    <div className="text-sm text-slate-500">{item.entry.sectionType ?? "general"}</div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {glossary.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
                По текущему фильтру слов нет
              </div>
            ) : (
              glossary.map((item) => {
                const key = `${item.lessonId}-${item.entry.id}`;
                const isFlipped = Boolean(flipped[key]);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setFlipped((current) => ({
                        ...current,
                        [key]: !current[key],
                      }))
                    }
                    className="min-h-[240px] rounded-[32px] border border-slate-200 bg-white p-6 text-left shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-amber-700">
                      <span>{item.lessonTitle}</span>
                      <span>{isFlipped ? "RU" : "DE"}</span>
                    </div>
                    <div className="mt-8 text-3xl font-semibold tracking-tight text-slate-950">
                      {isFlipped ? item.entry.ru : formatVocabularyLabel(item.entry)}
                    </div>
                    <div className="mt-4 text-sm leading-7 text-slate-500">
                      {isFlipped ? formatVocabularyLabel(item.entry) : item.entry.ru}
                    </div>
                    <div className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                      Нажми для переворота
                    </div>
                  </button>
                );
              })
            )}
          </section>
        )}
      </div>
    </main>
  );
}
