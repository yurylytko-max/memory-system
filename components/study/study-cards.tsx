"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { VocabularyItem } from "@/lib/vocabulary";

type VocabularyPayload = {
  items: VocabularyItem[];
  due: VocabularyItem[];
  now: string;
};

export default function StudyCards() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [due, setDue] = useState<VocabularyItem[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const response = await fetch("/api/vocabulary", { cache: "no-store" });
    const data = (await response.json()) as VocabularyPayload;
    setItems(Array.isArray(data.items) ? data.items : []);
    setDue(Array.isArray(data.due) ? data.due : []);
    setRevealed(false);
  }

  async function review(correct: boolean) {
    const current = due[0];

    if (!current) {
      return;
    }

    await fetch("/api/vocabulary/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: current.id,
        correct,
      }),
    });

    await load();
  }

  const current = due[0] ?? null;
  const upcoming = useMemo(() => due.slice(1, 5), [due]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#fffaf2_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Study 2.0
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              Карточки
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Здесь появляются только те слова и фразы, которые вы сохранили вручную из учебника.
            </p>
          </div>

          <Link
            href="/study"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            Вернуться к учебникам
          </Link>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            {!current ? (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500">
                На сегодня карточек нет. Сначала сохраните несколько слов или фраз из учебника.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                    Осталось сегодня: {due.length}
                  </span>
                  {current.source_lesson ? (
                    <span className="text-sm text-slate-500">
                      {current.source_lesson}
                      {current.source_page ? ` • стр. ${current.source_page}` : ""}
                    </span>
                  ) : null}
                </div>

                <article className="rounded-[2rem] border border-slate-200 bg-[#fffdf8] px-6 py-10 text-center shadow-inner">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Лицевая сторона
                  </div>
                  <div className="mt-6 text-3xl font-semibold leading-tight text-slate-950">
                    {current.text}
                  </div>

                  {revealed ? (
                    <div className="mt-10 border-t border-slate-200 pt-8">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Перевод
                      </div>
                      <div className="mt-4 text-2xl font-medium leading-tight text-slate-800">
                        {current.translation}
                      </div>

                      {current.context ? (
                        <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-600">
                          Контекст: {current.context}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>

                {revealed ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void review(false)}
                      className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Не знаю
                    </button>
                    <button
                      type="button"
                      onClick={() => void review(true)}
                      className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Знаю
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Показать перевод
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Очередь</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Всего в словаре: {items.length}
            </p>

            <div className="mt-5 space-y-3">
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  После текущей карточки очередь пока пустая.
                </div>
              ) : (
                upcoming.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="font-medium text-slate-900">{item.text}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.translation}</div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
