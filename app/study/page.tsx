"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  countDueCards,
  createStudyTextbook,
  deleteStudyTextbook,
  getAllStudyTextbooks,
  importStudyTextbook,
  type StudyTextbook,
} from "@/lib/study";
import { STUDY_IMPORT_TEMPLATE } from "@/lib/study-import";

function createEmptyTextbook() {
  const now = new Date().toISOString();

  return {
    id: Math.random().toString(36).slice(2, 10),
    title: "Новый учебник",
    languageCode: "de",
    createdAt: now,
    updatedAt: now,
    lessons: [],
  } satisfies StudyTextbook;
}

export default function StudyPage() {
  const router = useRouter();
  const [textbooks, setTextbooks] = useState<StudyTextbook[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [importValue, setImportValue] = useState(
    JSON.stringify(STUDY_IMPORT_TEMPLATE, null, 2)
  );
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const data = await getAllStudyTextbooks();
      setTextbooks(data);
      setLoaded(true);
    }

    void load();
  }, []);

  async function handleCreateBlank() {
    const textbook = createEmptyTextbook();
    await createStudyTextbook(textbook);
    router.push(`/study/${textbook.id}`);
  }

  async function handleImport() {
    try {
      setError("");
      const parsed = JSON.parse(importValue) as unknown;
      const textbook = await importStudyTextbook(parsed);
      await createStudyTextbook(textbook);
      router.push(`/study/${textbook.id}`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Не удалось импортировать JSON");
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) {
      return;
    }

    const raw = await file.text();
    setImportValue(raw);
  }

  async function handleDelete(id: string) {
    await deleteStudyTextbook(id);
    setTextbooks((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_transparent_25%),linear-gradient(180deg,#f8fafc_0%,#fff7ed_50%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Link
          href="/"
          className="inline-flex w-fit rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-amber-50"
        >
          ← Назад
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-amber-700">
              Study Flow
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              Учебники и уроки
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Отдельная учебная среда: уроки, грамматика, лексика, общий глоссарий и карточки с SRS.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleCreateBlank();
            }}
            className="inline-flex h-12 items-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Пустой учебник
          </button>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Библиотека</h2>
                <p className="text-sm text-slate-500">
                  Поток учебников можно держать в одной серии, но структура остаётся плоской и гибкой.
                </p>
              </div>
            </div>

            {!loaded ? (
              <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500">
                Загрузка учебников...
              </div>
            ) : textbooks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500">
                Учебников пока нет
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {textbooks.map((textbook) => {
                  const glossarySize = textbook.lessons.reduce(
                    (sum, lesson) => sum + lesson.vocabulary.length,
                    0
                  );

                  return (
                    <article
                      key={textbook.id}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-950">{textbook.title}</h3>
                          <p className="mt-2 text-sm text-slate-500">
                            {[textbook.series, textbook.level, textbook.languageCode.toUpperCase()]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          due {countDueCards(textbook)}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3 text-sm text-slate-600">
                        <div className="rounded-2xl bg-white px-3 py-3">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Уроки</div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {textbook.lessons.length}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-3">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Слова</div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">{glossarySize}</div>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-3">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Обновлён</div>
                          <div className="mt-1 text-sm font-semibold text-slate-950">
                            {new Date(textbook.updatedAt).toLocaleDateString("ru-RU")}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-medium">
                        <Link href={`/study/${textbook.id}`} className="text-slate-950 hover:text-slate-600">
                          открыть
                        </Link>
                        <Link
                          href={`/study/${textbook.id}/glossary`}
                          className="text-slate-600 hover:text-slate-950"
                        >
                          глоссарий
                        </Link>
                        <Link
                          href={`/study/${textbook.id}/review`}
                          className="text-slate-600 hover:text-slate-950"
                        >
                          карточки
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDelete(textbook.id);
                          }}
                          className="text-red-600 hover:text-red-500"
                        >
                          удалить
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-[28px] border border-slate-200 bg-[#111827] p-6 text-slate-100 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.55)]">
            <div className="mb-5">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-300">
                JSON Import
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Шлюз загрузки</h2>
              <p className="mt-2 text-sm text-slate-300">
                Сюда потом будет приходить подготовленный JSON из внешнего парсинга учебника.
              </p>
            </div>

            <label className="mb-3 block text-sm text-slate-300">
              JSON-файл
              <input
                type="file"
                accept="application/json"
                onChange={(event) => {
                  void handleFileChange(event.target.files?.[0] ?? null);
                }}
                className="mt-2 block w-full text-sm text-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
              />
            </label>

            <textarea
              value={importValue}
              onChange={(event) => setImportValue(event.target.value)}
              className="min-h-[420px] w-full rounded-[24px] border border-slate-700 bg-slate-950/70 p-4 font-mono text-xs leading-6 text-slate-100 outline-none"
              spellCheck={false}
            />

            {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}

            <button
              type="button"
              onClick={() => {
                void handleImport();
              }}
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-amber-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Импортировать учебник
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}
