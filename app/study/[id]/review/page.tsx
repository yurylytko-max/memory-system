"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import {
  buildReviewQueue,
  formatVocabularyLabel,
  getStudyTextbook,
  updateStudyTextbook,
  type StudyTextbook,
} from "@/lib/study";
import { applyReviewRating, type ReviewRating } from "@/lib/study-srs";

type Params = {
  id: string;
};

function getModeLabel(mode: "learn" | "review" | "all") {
  switch (mode) {
    case "learn":
      return "Изучение";
    case "review":
      return "Повторение";
    default:
      return "Все карточки";
  }
}

export default function StudyReviewPage() {
  const params = useParams() as Params;
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: "learn" | "review" | "all" =
    modeParam === "learn" || modeParam === "review" || modeParam === "all"
      ? modeParam
      : "review";

  const [textbook, setTextbook] = useState<StudyTextbook | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getStudyTextbook(params.id);
      setTextbook(data ?? null);
      setLoaded(true);
    }

    void load();
  }, [params.id]);

  const queue = useMemo(() => {
    if (!textbook) {
      return [];
    }

    return buildReviewQueue(textbook, mode);
  }, [mode, textbook]);

  const current = queue[index] ?? null;

  async function handleRate(rating: ReviewRating) {
    if (!textbook || !current || saving) {
      return;
    }

    const now = new Date().toISOString();
    const updatedTextbook: StudyTextbook = {
      ...textbook,
      updatedAt: now,
      lessons: textbook.lessons.map((lesson) => {
        if (lesson.id !== current.lessonId) {
          return lesson;
        }

        return {
          ...lesson,
          vocabulary: lesson.vocabulary.map((entry) => {
            if (entry.id !== current.entry.id) {
              return entry;
            }

            return {
              ...entry,
              review: {
                ...entry.review,
                [current.direction]: applyReviewRating(entry.review[current.direction], rating, now),
              },
            };
          }),
        };
      }),
    };

    try {
      setSaving(true);
      await updateStudyTextbook(updatedTextbook);
      setTextbook(updatedTextbook);
      setRevealed(false);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (index >= queue.length && queue.length > 0) {
      setIndex(0);
    }
  }, [index, queue.length]);

  if (!loaded) {
    return <main className="p-10 text-slate-500">Загрузка карточек...</main>;
  }

  if (!textbook) {
    return <main className="p-10 text-slate-500">Учебник не найден</main>;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fde68a,_transparent_18%),linear-gradient(180deg,#fff8eb_0%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/study/${textbook.id}`}
            className="inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-amber-50"
          >
            ← К учебнику
          </Link>
          <Link
            href={`/study/${textbook.id}/glossary`}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Глоссарий
          </Link>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
                Flashcards
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                {getModeLabel(mode)}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Отдельное состояние для направлений `DE → RU` и `RU → DE`.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["learn", "review", "all"] as const).map((modeOption) => (
                <Link
                  key={modeOption}
                  href={`/study/${textbook.id}/review?mode=${modeOption}`}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${mode === modeOption ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  {getModeLabel(modeOption)}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {current ? (
          <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
              <span>
                {current.lessonTitle} · {current.direction === "de_to_ru" ? "DE → RU" : "RU → DE"}
              </span>
              <span>
                {Math.min(index + 1, queue.length)} / {queue.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              className="mt-6 flex min-h-[360px] w-full flex-col items-start justify-between rounded-[32px] bg-slate-950 p-8 text-left text-white"
            >
              <div className="text-xs uppercase tracking-[0.24em] text-amber-300">
                {revealed ? "Ответ" : "Вопрос"}
              </div>

              <div className="space-y-4">
                <div className="text-4xl font-semibold tracking-tight">
                  {current.direction === "de_to_ru"
                    ? formatVocabularyLabel(current.entry)
                    : current.entry.translation}
                </div>

                {revealed ? (
                  <div className="rounded-[24px] bg-white/10 px-5 py-4 text-lg leading-8 text-slate-100">
                    {current.direction === "de_to_ru"
                      ? current.entry.translation
                      : formatVocabularyLabel(current.entry)}
                  </div>
                ) : null}
              </div>

              <div className="text-sm text-slate-300">
                {revealed ? "Нажми ещё раз, чтобы скрыть ответ" : "Нажми, чтобы открыть ответ"}
              </div>
            </button>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  void handleRate("again");
                }}
                disabled={!revealed || saving}
                className="h-12 rounded-2xl bg-rose-100 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Не помню
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleRate("hard");
                }}
                disabled={!revealed || saving}
                className="h-12 rounded-2xl bg-amber-100 text-sm font-medium text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Тяжело
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleRate("good");
                }}
                disabled={!revealed || saving}
                className="h-12 rounded-2xl bg-emerald-100 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Помню
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleRate("easy");
                }}
                disabled={!revealed || saving}
                className="h-12 rounded-2xl bg-sky-100 text-sm font-medium text-sky-800 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Легко
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-[36px] border border-dashed border-slate-300 bg-white px-6 py-20 text-center text-slate-500 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.25)]">
            Для текущего режима карточек пока нет. В `изучении` показываются новые и незавершённые карточки, в `повторении` только те, у которых наступил срок.
          </section>
        )}
      </div>
    </main>
  );
}
