"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import {
  formatVocabularyLabel,
  getBlockVocabulary,
  getLessonReviewStats,
  getStudyTextbook,
  type StudyBlock,
  type StudyContentItem,
  type StudyLesson,
  type StudyTask,
  type StudyTextbook,
} from "@/lib/study";

type Params = {
  id: string;
  lessonId: string;
};

function normalizeInput(value: string) {
  return value.trim().toLowerCase().replaceAll("ß", "ss").replace(/\s+/g, " ");
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function setsEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function renderContentItem(item: StudyContentItem) {
  if (item.type === "dialogue" && item.lines?.length) {
    return (
      <div className="space-y-3">
        {item.lines.map((line, index) => (
          <div key={`${item.id}-line-${index}`} className="rounded-2xl bg-white px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              {line.speaker ?? "реплика"}
            </div>
            <div className="mt-1 text-sm leading-7 text-slate-800">{line.text}</div>
            {Array.isArray(item.translationRu) && item.translationRu[index]?.text ? (
              <div className="mt-2 text-sm leading-6 text-slate-500">
                {item.translationRu[index]?.text}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white px-4 py-4">
      {item.text ? <div className="text-sm leading-7 text-slate-800">{item.text}</div> : null}
      {typeof item.translationRu === "string" ? (
        <div className="mt-3 text-sm leading-6 text-slate-500">{item.translationRu}</div>
      ) : null}
      {item.comprehensionFocus?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.comprehensionFocus.map((focus) => (
            <span
              key={`${item.id}-${focus}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {focus}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
}: {
  task: StudyTask;
}) {
  const [answer, setAnswer] = useState<string | string[] | Record<string, string>>(
    task.type === "multiple_choice"
      ? []
      : task.type === "matching" || task.type === "form_fill"
        ? {}
        : task.type === "ordering"
          ? []
          : ""
  );
  const [result, setResult] = useState<null | boolean>(null);

  function checkAnswer() {
    if (task.type === "single_choice") {
      const selected = typeof answer === "string" ? answer : "";
      const correct = task.options?.find((item) => item.isCorrect)?.id ?? "";
      setResult(selected === correct);
      return;
    }

    if (task.type === "multiple_choice") {
      const selected = Array.isArray(answer) ? answer : [];
      const correct = (task.options ?? []).filter((item) => item.isCorrect).map((item) => item.id);
      setResult(setsEqual([...selected].sort(), [...correct].sort()));
      return;
    }

    if (task.type === "fill_in_blank") {
      const value = normalizeInput(typeof answer === "string" ? answer : "");
      const normalizedAccepted = [
        ...(task.normalizedAcceptedAnswers ?? []).map(normalizeInput),
        ...(task.acceptedAnswers ?? []).map(normalizeInput),
      ];
      setResult(normalizedAccepted.includes(value));
      return;
    }

    if (task.type === "matching") {
      const current = typeof answer === "object" && !Array.isArray(answer) ? answer : {};
      const correct =
        task.correctPairs?.every(([leftId, rightId]) => current[leftId] === rightId) ?? false;
      setResult(correct);
      return;
    }

    if (task.type === "ordering") {
      const current = Array.isArray(answer) ? answer : [];
      setResult(arraysEqual(current, task.correctOrder ?? []));
      return;
    }

    if (task.type === "form_fill") {
      const current = typeof answer === "object" && !Array.isArray(answer) ? answer : {};
      const valid =
        task.fields?.every((field) => {
          const value = normalizeInput(current[field.id] ?? "");
          const accepted = [
            ...(field.normalizedAcceptedAnswers ?? []).map(normalizeInput),
            ...(field.acceptedAnswers ?? []).map(normalizeInput),
          ];
          return accepted.length > 0 && accepted.includes(value);
        }) ?? false;
      setResult(valid);
      return;
    }

    if (task.type === "guided_writing") {
      const value = normalizeInput(typeof answer === "string" ? answer : "");
      const required = (task.requiredPhrases ?? []).map(normalizeInput);
      setResult(required.length > 0 && required.every((phrase) => value.includes(phrase)));
    }
  }

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-amber-700">{task.type}</div>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">{task.instruction}</h4>
          {task.prompt ? <p className="mt-2 text-sm leading-7 text-slate-700">{task.prompt}</p> : null}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {task.skill}
        </span>
      </div>

      <div className="mt-4">
        {task.type === "single_choice" ? (
          <div className="space-y-2">
            {(task.options ?? []).map((option) => (
              <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <input
                  type="radio"
                  name={task.id}
                  checked={answer === option.id}
                  onChange={() => setAnswer(option.id)}
                />
                <span className="text-sm leading-6 text-slate-800">{option.text}</span>
              </label>
            ))}
          </div>
        ) : null}

        {task.type === "multiple_choice" ? (
          <div className="space-y-2">
            {(task.options ?? []).map((option) => {
              const selected = Array.isArray(answer) ? answer : [];
              const checked = selected.includes(option.id);

              return (
                <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setAnswer(
                        checked
                          ? selected.filter((item) => item !== option.id)
                          : [...selected, option.id]
                      )
                    }
                  />
                  <span className="text-sm leading-6 text-slate-800">{option.text}</span>
                </label>
              );
            })}
          </div>
        ) : null}

        {task.type === "fill_in_blank" ? (
          <input
            value={typeof answer === "string" ? answer : ""}
            onChange={(event) => setAnswer(event.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
            placeholder="Введите ответ"
          />
        ) : null}

        {task.type === "matching" ? (
          <div className="space-y-3">
            {(task.leftItems ?? []).map((item) => {
              const selected = typeof answer === "object" && !Array.isArray(answer) ? answer[item.id] ?? "" : "";

              return (
                <div key={item.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800">{item.text}</div>
                  <select
                    value={selected}
                    onChange={(event) =>
                      setAnswer((current) => ({
                        ...(typeof current === "object" && !Array.isArray(current) ? current : {}),
                        [item.id]: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
                  >
                    <option value="">Выберите пару</option>
                    {(task.rightItems ?? []).map((right) => (
                      <option key={right.id} value={right.id}>
                        {right.text}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        ) : null}

        {task.type === "ordering" ? (
          <div>
            <div className="flex flex-wrap gap-2">
              {(task.tokens ?? []).map((token) => {
                const current = Array.isArray(answer) ? answer : [];
                const active = current.includes(token);

                return (
                  <button
                    key={`${task.id}-${token}`}
                    type="button"
                    onClick={() =>
                      setAnswer(active ? current.filter((item) => item !== token) : [...current, token])
                    }
                    className={`rounded-full px-4 py-2 text-sm font-medium ${active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    {token}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              {(Array.isArray(answer) ? answer : []).join(" ")}
            </div>
          </div>
        ) : null}

        {task.type === "form_fill" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {(task.fields ?? []).map((field) => {
              const current = typeof answer === "object" && !Array.isArray(answer) ? answer[field.id] ?? "" : "";

              return (
                <label key={field.id} className="block">
                  <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{field.label}</div>
                  <input
                    value={current}
                    onChange={(event) =>
                      setAnswer((prev) => ({
                        ...(typeof prev === "object" && !Array.isArray(prev) ? prev : {}),
                        [field.id]: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
                  />
                </label>
              );
            })}
          </div>
        ) : null}

        {task.type === "guided_writing" ? (
          <div>
            {task.template?.length ? (
              <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-4 text-sm leading-7 text-slate-700">
                {task.template.map((line) => (
                  <div key={`${task.id}-${line}`}>{line}</div>
                ))}
              </div>
            ) : null}
            <textarea
              value={typeof answer === "string" ? answer : ""}
              onChange={(event) => setAnswer(event.target.value)}
              className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none"
              placeholder="Напишите ответ"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={checkAnswer}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Проверить
        </button>
        {result !== null ? (
          <span
            className={`rounded-full px-4 py-2 text-sm font-medium ${result ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
          >
            {result ? "Верно" : "Неверно"}
          </span>
        ) : null}
      </div>

      {task.explanation ? (
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
          <span className="font-medium text-slate-950">Пояснение:</span> {task.explanation}
        </div>
      ) : null}
      {task.sampleAnswer && task.type === "guided_writing" ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-slate-700">
          <span className="font-medium text-slate-950">Образец:</span> {task.sampleAnswer}
        </div>
      ) : null}
    </article>
  );
}

function BlockSection({
  textbookId,
  lesson,
  block,
}: {
  textbookId: string;
  lesson: StudyLesson;
  block: StudyBlock;
}) {
  const vocabulary = getBlockVocabulary(lesson, block.id);

  return (
    <section id={block.id} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
            Блок {block.code}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{block.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{block.goal}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/study/${textbookId}/review?mode=learn&lessonId=${lesson.id}&blockId=${block.id}`}
            className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Учить слова блока
          </Link>
          <Link
            href={`/study/${textbookId}/review?mode=review&lessonId=${lesson.id}&blockId=${block.id}`}
            className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
          >
            Повторить блок
          </Link>
        </div>
      </div>

      {block.intro ? (
        <div className="mt-5 rounded-[24px] bg-amber-50 px-5 py-4 text-sm leading-7 text-slate-700">
          {block.intro}
        </div>
      ) : null}

      {block.corePhrases.length > 0 ? (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Ключевые фразы</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {block.corePhrases.map((phrase) => (
              <span
                key={`${block.id}-${phrase}`}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {phrase}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="space-y-5">
          {block.content.explainer ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700">
              {block.content.explainer}
            </div>
          ) : null}

          {block.content.dialogues.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Диалоги</h3>
              <div className="mt-4 space-y-4">
                {block.content.dialogues.map((item) => (
                  <article key={item.id} className="rounded-[24px] bg-slate-50 p-5">
                    <h4 className="text-lg font-semibold text-slate-950">{item.title}</h4>
                    <div className="mt-4">{renderContentItem(item)}</div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {block.content.readings.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Чтение</h3>
              <div className="mt-4 space-y-4">
                {block.content.readings.map((item) => (
                  <article key={item.id} className="rounded-[24px] bg-slate-50 p-5">
                    <h4 className="text-lg font-semibold text-slate-950">{item.title}</h4>
                    <div className="mt-4">{renderContentItem(item)}</div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {block.tasks.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Упражнения</h3>
              <div className="mt-4 space-y-4">
                {block.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="rounded-[24px] bg-slate-50 p-5">
            <h3 className="text-xl font-semibold text-slate-950">Грамматика блока</h3>
            <div className="mt-4 space-y-4">
              {block.grammarPoints.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  Для этого блока грамматика пока не заполнена
                </div>
              ) : (
                block.grammarPoints.map((point) => (
                  <article key={point.id} className="rounded-2xl bg-white p-4">
                    <h4 className="text-lg font-semibold text-slate-950">{point.title}</h4>
                    {point.summary ? (
                      <p className="mt-2 text-sm font-medium text-amber-700">{point.summary}</p>
                    ) : null}
                    <div className="mt-3 text-sm leading-7 text-slate-700">{point.explanation}</div>
                    {point.pattern ? (
                      <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100">
                        {point.pattern}
                      </div>
                    ) : null}
                    {point.examples.length > 0 ? (
                      <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-slate-700">
                        {point.examples.map((example) => (
                          <li key={`${point.id}-${example}`}>{example}</li>
                        ))}
                      </ul>
                    ) : null}
                    {point.pitfalls?.length ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                        <div className="text-xs uppercase tracking-wide text-rose-700">Типичные ошибки</div>
                        <ul className="mt-3 list-disc pl-5 text-sm leading-7 text-rose-900">
                          {point.pitfalls.map((pitfall) => (
                            <li key={`${point.id}-${pitfall}`}>{pitfall}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[24px] bg-slate-50 p-5">
            <h3 className="text-xl font-semibold text-slate-950">Лексика блока</h3>
            <div className="mt-4 space-y-3">
              {vocabulary.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  Для этого блока словарь пока не заполнен
                </div>
              ) : (
                vocabulary.map((entry) => (
                  <div key={entry.id} className="rounded-2xl bg-white px-4 py-4">
                    <div className="text-base font-semibold text-slate-950">{formatVocabularyLabel(entry)}</div>
                    <div className="mt-1 text-sm text-slate-600">{entry.ru}</div>
                    {entry.tags?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span
                            key={`${entry.id}-${tag}`}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

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

  const reviewStats = useMemo(() => {
    if (!textbook || !lesson) {
      return null;
    }

    return getLessonReviewStats(textbook, lesson.id);
  }, [lesson, textbook]);

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
            Глоссарий урока
          </Link>
          <Link
            href={`/study/${textbook.id}/review?mode=learn&lessonId=${lesson.id}`}
            className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Учить слова урока
          </Link>
          <Link
            href={`/study/${textbook.id}/review?mode=review&lessonId=${lesson.id}`}
            className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100"
          >
            Повторить урок
          </Link>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">Урок {lesson.order}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{lesson.title}</h1>
          {lesson.topic ? <p className="mt-3 text-lg text-slate-600">{lesson.topic}</p> : null}
          {lesson.notes ? (
            <div className="mt-5 rounded-[24px] bg-amber-50 px-5 py-4">
              <div className="text-xs uppercase tracking-wide text-amber-700">Заметки</div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{lesson.notes}</div>
            </div>
          ) : null}

          {reviewStats ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Карточек</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{reviewStats.totalDirections}</div>
                <div className="mt-1 text-sm text-slate-500">с учётом двух направлений</div>
              </div>
              <div className="rounded-[24px] bg-amber-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-amber-700">Изучение</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{reviewStats.learningDirections}</div>
                <div className="mt-1 text-sm text-slate-500">новые и незавершённые</div>
              </div>
              <div className="rounded-[24px] bg-emerald-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-emerald-700">Повторить</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{reviewStats.dueDirections}</div>
                <div className="mt-1 text-sm text-slate-500">карточек уже подошло</div>
              </div>
            </div>
          ) : null}

          {lesson.blocks.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {lesson.blocks.map((block) => (
                <a
                  key={block.id}
                  href={`#${block.id}`}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  {block.code}. {block.title}
                </a>
              ))}
            </div>
          ) : null}
        </section>

        {lesson.blocks.map((block) => (
          <BlockSection key={block.id} textbookId={textbook.id} lesson={lesson} block={block} />
        ))}

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-semibold text-slate-950">Summary</h2>
            <div className="mt-5 space-y-5">
              {lesson.summary.grammar.length > 0 ? (
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Грамматика</div>
                  <div className="mt-3 space-y-3">
                    {lesson.summary.grammar.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-4">
                        <div className="text-base font-semibold text-slate-950">{item.title}</div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">{item.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {lesson.summary.communication.length > 0 ? (
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Коммуникация</div>
                  <div className="mt-3 space-y-3">
                    {lesson.summary.communication.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-4">
                        <div className="text-base font-semibold text-slate-950">{item.title}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.phrases.map((phrase) => (
                            <span
                              key={`${item.id}-${phrase}`}
                              className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700"
                            >
                              {phrase}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {lesson.summary.goals.length > 0 ? (
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Цели урока</div>
                  <ul className="mt-3 list-disc pl-5 text-sm leading-7 text-slate-700">
                    {lesson.summary.goals.map((goal) => (
                      <li key={`${lesson.id}-${goal}`}>{goal}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </article>

          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-semibold text-slate-950">Extras</h2>
            <div className="mt-5 space-y-4">
              {lesson.extras.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  Дополнительные материалы пока не загружены
                </div>
              ) : (
                lesson.extras.map((item) => (
                  <article key={item.id} className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {item.type}
                      </span>
                    </div>
                    {item.content.text ? (
                      <div className="mt-3 text-sm leading-7 text-slate-700">{item.content.text}</div>
                    ) : null}
                    {item.content.items?.length ? (
                      <ul className="mt-3 list-disc pl-5 text-sm leading-7 text-slate-700">
                        {item.content.items.map((entry) => (
                          <li key={`${item.id}-${entry}`}>{entry}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
