"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import StudyThreeMnemonicPanel from "@/components/study-3/study-three-mnemonic-panel";
import type {
  VocabularyItem,
  VocabularyMnemonicRecommendation,
  VocabularyReviewQueue,
  VocabularyReviewRating,
} from "@/lib/vocabulary";

type ReviewResponse = VocabularyReviewQueue & {
  error?: string;
  items?: VocabularyItem[];
  queue?: VocabularyReviewQueue;
  reviewedItem?: VocabularyItem;
  recommendation?: VocabularyMnemonicRecommendation;
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

export default function StudyThreeVocabularyReview() {
  const [queue, setQueue] = useState<VocabularyReviewQueue | null>(null);
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [error, setError] = useState("");
  const [showBack, setShowBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMnemonicItem, setActiveMnemonicItem] = useState<VocabularyItem | null>(null);
  const [lastReviewedItem, setLastReviewedItem] = useState<VocabularyItem | null>(null);
  const [recommendation, setRecommendation] = useState<VocabularyMnemonicRecommendation | null>(
    null
  );
  const applyState = (data: ReviewResponse) => {
    const nextQueue = data.queue ?? data;
    setQueue({
      now: nextQueue.now,
      newItems: Array.isArray(nextQueue.newItems) ? nextQueue.newItems : [],
      dueItems: Array.isArray(nextQueue.dueItems) ? nextQueue.dueItems : [],
      queue: Array.isArray(nextQueue.queue) ? nextQueue.queue : [],
    });
    if (Array.isArray(data.items)) {
      setItems(data.items);
    }
    setShowBack(false);
    setError("");
  };

  const fetchState = async () => {
    const response = await fetch("/api/vocabulary?source=study-3", { cache: "no-store" });
    const data = await readJsonSafely<ReviewResponse>(response);

    if (!response.ok) {
      throw new Error(data.error ?? "Не удалось загрузить сессию изучения.");
    }

    return data;
  };

  useEffect(() => {
    let cancelled = false;

    void fetchState()
      .then((data) => {
        if (!cancelled) {
          applyState(data);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить сессию изучения.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleReview(rating: VocabularyReviewRating) {
    if (!currentItem) {
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/vocabulary/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: currentItem.id,
        rating,
      }),
    });
    const data = await readJsonSafely<{ queue?: VocabularyReviewQueue; error?: string }>(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Не удалось сохранить ответ.");
      return;
    }

    setLastReviewedItem(data.reviewedItem ?? null);
    setRecommendation(data.recommendation ?? null);

    if (data.queue) {
      setQueue(data.queue);
      setShowBack(false);
      setError("");
      setItems((current) =>
        current.map((entry) => (data.reviewedItem && entry.id === data.reviewedItem.id ? data.reviewedItem : entry))
      );
      return;
    }

    try {
      applyState(await fetchState());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить сессию изучения.");
    }
  }

  async function handleMnemonicWorked(worked: boolean) {
    const targetItem = currentItem;

    if (!targetItem || targetItem.mnemonic_status !== "anchored") {
      return;
    }

    setIsSubmitting(true);

    const response = await fetch(`/api/vocabulary/${targetItem.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        worked_last_time: worked,
      }),
    });
    const data = await readJsonSafely<{ item?: VocabularyItem; error?: string }>(response);
    setIsSubmitting(false);

    if (!response.ok || !data.item) {
      setError(data.error ?? "Не удалось сохранить обратную связь по мнемотехнике.");
      return;
    }

    setItems((current) => current.map((entry) => (entry.id === data.item?.id ? data.item : entry)));
    if (!worked) {
      setActiveMnemonicItem(data.item);
    }
  }

  const currentItem = queue?.queue[0] ?? null;
  const currentItemDetails =
    currentItem ? items.find((entry) => entry.id === currentItem.id) ?? currentItem : null;
  const mnemonicSourceItem = activeMnemonicItem;

  return (
    <main
      className="min-h-screen bg-white px-6 py-10"
      data-testid={error ? "study-vocabulary-review-error" : "study-vocabulary-review-page"}
    >
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/study-3/vocabulary"
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← К словарю
            </Link>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Учить лексику
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Новые слова идут последовательно в порядке добавления. После первого прохождения они
              переходят в интервальные повторения.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-[#fffdf7] px-5 py-4 text-sm text-slate-600 shadow-sm">
            <div>Новых: {queue?.newItems.length ?? 0}</div>
            <div>На повторении: {queue?.dueItems.length ?? 0}</div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {recommendation?.recommended && lastReviewedItem ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
            <div className="font-medium">
              Карточке стоит добавить мнемотехнику
              {recommendation.reason === "error"
                ? " после ошибки."
                : recommendation.reason === "unstable"
                  ? " из-за нестабильных ответов."
                  : "."}
            </div>
            <div className="mt-2">
              {lastReviewedItem.text} {"->"} {lastReviewedItem.translation}
            </div>
            <button
              type="button"
              onClick={() => setActiveMnemonicItem(lastReviewedItem)}
              className="mt-4 rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
            >
              Включить мнемотехнику
            </button>
          </div>
        ) : null}

        {!error && !currentItem ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
            <div className="text-2xl font-semibold text-slate-900">На сегодня всё</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Сейчас нет новых слов и карточек, готовых к повторению.
            </p>
          </div>
        ) : null}

        {currentItem ? (
          <section className="space-y-6">
            <div
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              data-testid={`study-vocabulary-review-card-${currentItem.id}`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
                  {currentItem.status === "new" ? "новая карточка" : "повторение"}
                </span>
                <span className="text-sm text-slate-500">
                  {currentItem.source_book_title ?? "Учебник"}
                  {currentItem.source_page ? ` · стр. ${currentItem.source_page}` : ""}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>
                  Мнемотехника:{" "}
                  {currentItemDetails?.mnemonic_status === "anchored"
                    ? "закреплено"
                    : currentItemDetails?.mnemonic_status === "in_progress"
                      ? "в процессе"
                      : "нет"}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMnemonicItem(currentItemDetails ?? currentItem)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  Включить мнемотехнику
                </button>
              </div>

              <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-[#fffdf7] p-10 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {showBack ? "Обратная сторона" : "Лицевая сторона"}
                </div>
                <div className="mt-5 text-4xl font-semibold text-slate-950">
                  {showBack ? currentItem.translation : currentItem.text}
                </div>
                {showBack && currentItem.context ? (
                  <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-600">
                    Контекст: {currentItem.context}
                  </p>
                ) : null}
                {showBack && currentItemDetails?.mnemonic_status !== "none" && currentItemDetails?.mnemonic ? (
                  <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-left text-sm text-slate-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-900">
                      Мнемотехника
                    </div>
                    <div className="mt-2">{renderMnemonicSummary(currentItemDetails, items)}</div>
                  </div>
                ) : null}
              </div>

              {!showBack ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowBack(true)}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Показать перевод
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  <ReviewButton
                    label="Снова"
                    onClick={() => void handleReview("again")}
                    disabled={isSubmitting}
                  />
                  <ReviewButton
                    label="Трудно"
                    onClick={() => void handleReview("hard")}
                    disabled={isSubmitting}
                  />
                  <ReviewButton
                    label="Хорошо"
                    onClick={() => void handleReview("good")}
                    disabled={isSubmitting}
                  />
                  <ReviewButton
                    label="Легко"
                    onClick={() => void handleReview("easy")}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {showBack && currentItemDetails?.mnemonic_status === "anchored" ? (
                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-900">Ассоциация сработала?</div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleMnemonicWorked(true)}
                      disabled={isSubmitting}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMnemonicWorked(false)}
                      disabled={isSubmitting}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      Нет, переделать
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {mnemonicSourceItem ? (
          <StudyThreeMnemonicPanel
            item={mnemonicSourceItem}
            allItems={items}
            onClose={() => {
              setActiveMnemonicItem(null);
              setRecommendation(null);
            }}
            onSaved={(updatedItem) => {
              setItems((current) =>
                current.some((entry) => entry.id === updatedItem.id)
                  ? current.map((entry) => (entry.id === updatedItem.id ? updatedItem : entry))
                  : [...current, updatedItem]
              );
              if (currentItem?.id === updatedItem.id) {
                setRecommendation(null);
              }
              setActiveMnemonicItem(updatedItem);
            }}
          />
        ) : null}
      </div>
    </main>
  );
}

function ReviewButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function renderMnemonicSummary(item: VocabularyItem, items: VocabularyItem[]) {
  if (!item.mnemonic || !item.mnemonic_mode) {
    return "";
  }

  if (item.mnemonic_mode === "sound" && item.mnemonic.kind === "sound") {
    return `${item.mnemonic.sound_anchor ?? ""} -> ${item.mnemonic.image_anchor ?? ""}`;
  }

  if (item.mnemonic_mode === "image" && item.mnemonic.kind === "image") {
    return `${item.mnemonic.action ?? ""} -> ${item.mnemonic.interaction ?? ""}`;
  }

  if (item.mnemonic_mode === "linked_word" && item.mnemonic.kind === "linked_word") {
    return `${items.find((entry) => entry.id === item.mnemonic?.target_card_id)?.text ?? "связанное слово"} -> ${item.mnemonic.relation ?? ""}`;
  }

  if (item.mnemonic_mode === "chain" && item.mnemonic.kind === "chain") {
    return item.mnemonic.elements.map((element) => element.label).join(" -> ");
  }

  if (item.mnemonic_mode === "nested" && item.mnemonic.kind === "nested") {
    return renderNestedCue(item.mnemonic.base);
  }

  return "";
}

function renderNestedCue(
  base:
    | {
        label: string;
        placement?: string;
        children: Array<{
          label: string;
          placement?: string;
          children: unknown[];
        }>;
      }
    | undefined
) {
  if (!base) {
    return "";
  }

  if (base.children.length === 0) {
    return base.label;
  }

  const child = base.children[0];
  return `${base.label} -> ${child.placement ?? "внутрь"} -> ${renderNestedCue(child)}`;
}
