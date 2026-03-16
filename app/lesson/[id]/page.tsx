"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { createCard } from "@/lib/cards";
import {
  getImportedCourse,
  getLessonProgress,
  saveLessonProgress,
  type CourseLesson,
  type LessonExercise,
} from "@/lib/language-course";

type Params = {
  id: string;
};

function buildContentBlocks(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0);
}

function ExerciseCard({
  exercise,
  value,
  onChange,
}: {
  exercise: LessonExercise;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const normalizedAnswer = value.trim().toLowerCase();
  const isCorrect = normalizedAnswer === exercise.answer.toLowerCase();
  const hasValue = normalizedAnswer.length > 0;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-base leading-7 text-slate-800">
        {exercise.prompt}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Впиши пропущенное слово"
          className="h-11 min-w-[220px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-slate-400"
        />

        {hasValue && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isCorrect
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isCorrect ? "Верно" : `Нужно: ${exercise.answer}`}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Исходная фраза: {exercise.sourceSentence}
      </p>
    </div>
  );
}

function GlossaryCard({
  term,
  context,
  flipped,
  onFlip,
  onAddCard,
}: {
  term: string;
  context: string;
  flipped: boolean;
  onFlip: () => void;
  onAddCard: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={onFlip}
        className="flex min-h-40 w-full flex-col items-start justify-between rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300"
      >
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          {flipped ? "Контекст" : "Слово"}
        </div>
        <div className="text-2xl font-semibold text-slate-950">
          {flipped ? context : term}
        </div>
      </button>

      <button
        type="button"
        onClick={onAddCard}
        className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Создать обычную карточку
      </button>
    </div>
  );
}

export default function LessonPage() {
  const params = useParams() as Params;
  const course = useMemo(() => getImportedCourse(), []);
  const lesson = useMemo(
    () => course?.lessons.find((item) => item.id === params.id) ?? null,
    [course, params.id]
  );
  const initialProgress = useMemo(
    () => getLessonProgress(params.id),
    [params.id]
  );
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialProgress.answers
  );
  const [flippedGlossaryIds, setFlippedGlossaryIds] = useState<string[]>(
    initialProgress.flippedGlossaryIds
  );
  const [createdCardIds, setCreatedCardIds] = useState<string[]>([]);

  if (!course || !lesson) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_36%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <BackButton
            fallbackHref="/lesson"
            className="inline-flex w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 shadow-sm transition hover:bg-orange-50"
          >
            ← Назад
          </BackButton>

          <div className="rounded-[32px] border border-orange-200 bg-white p-8 text-center shadow-[0_18px_50px_-35px_rgba(120,53,15,0.35)]">
            <h1 className="text-3xl font-semibold text-slate-950">
              Урок не найден
            </h1>
            <Link
              href="/lesson"
              className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              К списку уроков
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const contentBlocks = buildContentBlocks(lesson.content);

  function updateProgress(nextAnswers: Record<string, string>, nextFlipped: string[]) {
    saveLessonProgress(lesson.id, {
      answers: nextAnswers,
      flippedGlossaryIds: nextFlipped,
    });
  }

  function handleAnswerChange(exerciseId: string, value: string) {
    const nextAnswers = {
      ...answers,
      [exerciseId]: value,
    };

    setAnswers(nextAnswers);
    updateProgress(nextAnswers, flippedGlossaryIds);
  }

  function handleFlip(glossaryId: string) {
    const nextFlipped = flippedGlossaryIds.includes(glossaryId)
      ? flippedGlossaryIds.filter((id) => id !== glossaryId)
      : [...flippedGlossaryIds, glossaryId];

    setFlippedGlossaryIds(nextFlipped);
    updateProgress(answers, nextFlipped);
  }

  async function handleCreateVocabularyCard(
    currentLesson: CourseLesson,
    term: string,
    context: string
  ) {
    if (createdCardIds.includes(term)) {
      return;
    }

    await createCard({
      id: crypto.randomUUID(),
      title: term,
      content: context,
      source: `lesson:${currentLesson.index}`,
      type: "thought",
      tags: ["lesson-vocabulary", currentLesson.title.toLowerCase()],
      image: null,
    });

    setCreatedCardIds((current) => [...current, term]);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_36%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-orange-200 bg-white/90 p-5 shadow-[0_18px_50px_-35px_rgba(120,53,15,0.35)] backdrop-blur">
          <BackButton
            fallbackHref="/lesson"
            className="inline-flex w-fit rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-900 transition hover:bg-orange-100"
          >
            ← Уроки
          </BackButton>

          <div className="mt-5">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-orange-700">
              Курс
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              {course.sourceFileName}
            </h2>
          </div>

          <div className="mt-6 space-y-2">
            {course.lessons.map((item) => {
              const active = item.id === lesson.id;

              return (
                <Link
                  key={item.id}
                  href={`/lesson/${item.id}`}
                  className={`block rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-medium">Урок {item.index}</div>
                  <div className={active ? "text-slate-200" : "text-slate-500"}>
                    {item.title}
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        <div className="flex flex-col gap-6">
          <section className="rounded-[32px] border border-orange-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(120,53,15,0.35)] backdrop-blur">
            <div className="text-sm font-medium text-orange-700">
              Урок {lesson.index}
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {lesson.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
              <span>страницы: {lesson.pageStart}-{lesson.pageEnd}</span>
              <span>упражнений: {lesson.exercises.length}</span>
              <span>словарь: {lesson.glossary.length} карточек</span>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Текст урока
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Основа для чтения, упражнений и карточек словаря.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-[17px] leading-8 text-slate-800">
              {contentBlocks.map((block, index) => (
                <p key={`${lesson.id}-block-${index}`}>
                  {block}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-semibold text-slate-950">
              Упражнения
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Автогенерируемые задания по тексту урока. Ответы сохраняются локально.
            </p>

            <div className="mt-6 space-y-4">
              {lesson.exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  value={answers[exercise.id] ?? ""}
                  onChange={(nextValue) =>
                    handleAnswerChange(exercise.id, nextValue)
                  }
                />
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-semibold text-slate-950">
              Глоссарий урока
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Отдельные карточки для слов урока. Нажми на карточку, чтобы перевернуть.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {lesson.glossary.map((card) => (
                <GlossaryCard
                  key={card.id}
                  term={card.term}
                  context={card.context}
                  flipped={flippedGlossaryIds.includes(card.id)}
                  onFlip={() => handleFlip(card.id)}
                  onAddCard={() =>
                    void handleCreateVocabularyCard(
                      lesson,
                      card.term,
                      card.context
                    )
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
