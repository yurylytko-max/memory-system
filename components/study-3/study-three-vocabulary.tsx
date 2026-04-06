"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { VocabularyItem, VocabularyReviewQueue } from "@/lib/vocabulary";

type VocabularyResponse = {
  items?: VocabularyItem[];
  queue?: VocabularyReviewQueue | null;
  error?: string;
};

async function readJsonSafely<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return { error: raw.trim() || "Сервер вернул некорректный ответ." } as T;
  }
}

export default function StudyThreeVocabulary() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [queue, setQueue] = useState<VocabularyReviewQueue | null>(null);
  const [status, setStatus] = useState("Загружаем словарь...");
  const [error, setError] = useState("");
  const [deletingItemId, setDeletingItemId] = useState("");

  async function loadVocabulary() {
    const response = await fetch("/api/vocabulary?source=study-3", { cache: "no-store" });
    const data = await readJsonSafely<VocabularyResponse>(response);

    if (!response.ok) {
      setError(data.error ?? "Не удалось загрузить словарь.");
      setStatus("Словарь недоступен.");
      return;
    }

    setItems(Array.isArray(data.items) ? data.items : []);
    setQueue(data.queue ?? null);
    setStatus("Словарь готов.");
  }

  useEffect(() => {
    void loadVocabulary();
  }, []);

  async function handleDelete(item: VocabularyItem) {
    if (!window.confirm(`Удалить слово "${item.text}" из словаря?`)) {
      return;
    }

    setDeletingItemId(item.id);
    setError("");

    try {
      const response = await fetch(`/api/vocabulary/${item.id}`, {
        method: "DELETE",
      });
      const data = await readJsonSafely<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось удалить карточку.");
      }

      await loadVocabulary();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить карточку.");
    } finally {
      setDeletingItemId("");
    }
  }

  return (
    <main
      className="min-h-screen bg-white px-6 py-10"
      data-testid={error ? "study-vocabulary-error" : "study-vocabulary-page"}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/study-3"
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← К учебникам
            </Link>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Словарь</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Здесь живут только слова из пространства Учебники 3.0. Они не попадают в общую
              базу знаний и отсюда же уходят в режим изучения карточек.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/study-3/vocabulary/review"
              className="rounded-full border border-slate-300 bg-slate-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Учить лексику
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Всего слов" value={String(items.length)} />
          <SummaryCard label="Новые" value={String(queue?.newItems.length ?? 0)} />
          <SummaryCard label="Готовы к повторению" value={String(queue?.dueItems.length ?? 0)} />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Список слов</h2>
              <p className="mt-2 text-sm text-slate-600">{status}</p>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!error && items.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              Словарь пока пуст. Откройте учебник, выделите слово и добавьте его сюда.
            </div>
          ) : null}

          {items.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-[#fffdf7] p-5"
                  data-testid={`study-vocabulary-item-${item.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-950">{item.text}</h3>
                      <p className="mt-2 text-lg text-slate-700">{item.translation}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
                      {getStatusLabel(item)}
                    </span>
                  </div>

                  {item.context ? (
                    <p className="mt-4 text-sm leading-7 text-slate-600">Контекст: {item.context}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>{item.source_book_title ?? "Учебник"}</span>
                    {item.source_page ? <span>стр. {item.source_page}</span> : null}
                    <span>следующее повторение: {formatIso(item.next_review)}</span>
                    <span>
                      мнемотехника:{" "}
                      {item.mnemonic_status === "anchored"
                        ? "закреплено"
                        : item.mnemonic_status === "in_progress"
                          ? "в процессе"
                          : "нет"}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingItemId === item.id}
                      className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingItemId === item.id ? "Удаляем..." : "Удалить"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-[#fffdf7] p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function getStatusLabel(item: VocabularyItem) {
  if (item.status === "new") {
    return "новое";
  }

  if (item.status === "learning") {
    return "в изучении";
  }

  return "на повторении";
}

function formatIso(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "скоро";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
