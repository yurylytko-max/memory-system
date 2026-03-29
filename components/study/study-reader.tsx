"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf";

import StudyPageRenderer from "@/components/study/study-page-renderer";
import type { StudyBook, StudyPageDocument } from "@/lib/study";

GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs";

type SelectionState = {
  text: string;
  context: string;
  translation: string;
  explanation: string;
};

export default function StudyReader({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<StudyBook | null>(null);
  const [annotatedPages, setAnnotatedPages] = useState<number[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [annotation, setAnnotation] = useState<StudyPageDocument | null>(null);
  const [status, setStatus] = useState("Загружаем учебник...");
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");

  const pdfDocumentRef = useRef<any>(null);

  useEffect(() => {
    void (async () => {
      setError("");
      setStatus("Читаем метаданные учебника...");

      const response = await fetch(`/api/study/books/${bookId}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Не удалось загрузить учебник.");
        return;
      }

      setBook(data.book);
      setAnnotatedPages(Array.isArray(data.annotated_pages) ? data.annotated_pages : []);
      setPageNumber(1);
    })();
  }, [bookId]);

  useEffect(() => {
    if (!book) {
      return;
    }

    void (async () => {
      setError("");
      setSelection(null);
      setChatAnswer("");
      setStatus("Проверяем, есть ли сохранённая разметка...");

      const existingResponse = await fetch(`/api/study/books/${book.id}/pages/${pageNumber}`, {
        cache: "no-store",
      });

      if (existingResponse.ok) {
        const data = await existingResponse.json();
        setAnnotation(data.annotation);
        setStatus("Страница загружена из сохранённой разметки.");
        setAnnotatedPages((current) =>
          current.includes(pageNumber) ? current : [...current, pageNumber].sort((a, b) => a - b)
        );
        return;
      }

      const imageDataUrl = await getPageImageData(book, pageNumber, pdfDocumentRef);
      setStatus("Размечаем страницу через Gemini...");

      const annotateResponse = await fetch(
        `/api/study/books/${book.id}/pages/${pageNumber}/annotate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageDataUrl,
          }),
        }
      );

      const annotateData = await annotateResponse.json();

      if (!annotateResponse.ok) {
        setError(annotateData.error ?? "Не удалось разметить страницу.");
        return;
      }

      setAnnotation(annotateData.annotation);
      setAnnotatedPages((current) =>
        current.includes(pageNumber) ? current : [...current, pageNumber].sort((a, b) => a - b)
      );
      setStatus(annotateData.cached ? "Страница загружена из кэша." : "Страница размечена.");
    })();
  }, [book, pageNumber]);

  async function getPageImageData(
    currentBook: StudyBook,
    targetPage: number,
    pdfRef: { current: any }
  ) {
    if (currentBook.mime_type === "application/pdf") {
      setStatus("Рендерим PDF-страницу...");

      if (!pdfRef.current) {
        const response = await fetch(`/api/study/books/${currentBook.id}/file`, {
          cache: "no-store",
        });
        const buffer = await response.arrayBuffer();
        pdfRef.current = await getDocument({ data: buffer }).promise;
      }

      const pdfDocument = pdfRef.current;
      const page = await pdfDocument.getPage(targetPage);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Не удалось создать canvas для страницы.");
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      return canvas.toDataURL("image/png");
    }

    setStatus("Готовим изображение страницы...");

    const response = await fetch(`/api/study/books/${currentBook.id}/file`, { cache: "no-store" });
    const blob = await response.blob();

    const fileReader = new FileReader();

    return await new Promise<string>((resolve, reject) => {
      fileReader.onerror = () => reject(new Error("Не удалось прочитать изображение."));
      fileReader.onload = () => resolve(String(fileReader.result ?? ""));
      fileReader.readAsDataURL(blob);
    });
  }

  async function handleSelect(payload: { text: string; context: string }) {
    setSelection({
      text: payload.text,
      context: payload.context,
      translation: "",
      explanation: "",
    });
    setChatAnswer("");

    const response = await fetch("/api/study/assistant/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Не удалось получить перевод.");
      return;
    }

    setSelection({
      text: payload.text,
      context: payload.context,
      translation: data.translation ?? "",
      explanation: "",
    });
  }

  async function handleExplain() {
    if (!selection) {
      return;
    }

    setIsExplaining(true);

    const response = await fetch("/api/study/assistant/explain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: selection.text,
        context: selection.context,
      }),
    });
    const data = await response.json();
    setIsExplaining(false);

    if (!response.ok) {
      setError(data.error ?? "Не удалось получить объяснение.");
      return;
    }

    setSelection((current) =>
      current
        ? {
            ...current,
            explanation: data.explanation ?? "",
          }
        : current
    );
  }

  async function handleCreateCard() {
    if (!selection?.text || !selection.translation || !annotation) {
      return;
    }

    const response = await fetch("/api/vocabulary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: selection.text,
        translation: selection.translation,
        context: selection.context,
        source_lesson: annotation.lesson_title,
        source_page: annotation.page_number,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Не удалось создать карточку.");
      return;
    }

    setStatus("Карточка сохранена в словарь.");
  }

  async function handleAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!chatQuestion.trim() || !annotation) {
      return;
    }

    const response = await fetch("/api/study/assistant/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: chatQuestion,
        selectedText: selection?.text ?? "",
        context: selection?.context ?? "",
        pageTitle: annotation.lesson_title,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Ассистент не ответил.");
      return;
    }

    setChatAnswer(data.answer ?? "");
  }

  const progressLabel = useMemo(() => {
    if (!book) {
      return "0 / 0";
    }

    return `${pageNumber} / ${book.page_count}`;
  }, [book, pageNumber]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#fffdf6_45%,#ffffff_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/study"
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← К библиотеке
            </Link>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {book?.title ?? "Учебник"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Страница размечается только при первом открытии. Потом используется сохранённый JSON.
            </p>
          </div>

          <Link
            href="/study/cards"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            Карточки
          </Link>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900">Статус</div>
              <div className="mt-1 text-sm text-slate-600">{status}</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!book || pageNumber <= 1}
                onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Назад
              </button>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                {progressLabel}
              </div>
              <button
                type="button"
                disabled={!book || pageNumber >= (book?.page_count ?? 1)}
                onClick={() =>
                  setPageNumber((current) => Math.min(book?.page_count ?? current, current + 1))
                }
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Вперёд
              </button>
            </div>
          </div>

          {book ? (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{ width: `${(pageNumber / book.page_count) * 100}%` }}
              />
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_360px]">
          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Навигация</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Уже размечено страниц: {annotatedPages.length}
            </p>

            <div className="mt-5 grid max-h-[70vh] grid-cols-4 gap-2 overflow-auto pr-1">
              {Array.from({ length: book?.page_count ?? 0 }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setPageNumber(page)}
                  className={`rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    page === pageNumber
                      ? "bg-slate-950 text-white"
                      : annotatedPages.includes(page)
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-[70vh] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            {!annotation ? (
              <div className="flex min-h-[55vh] items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 text-center text-sm leading-7 text-slate-500">
                Подготавливаем страницу...
              </div>
            ) : (
              <StudyPageRenderer
                document={annotation}
                onSelect={(payload) => {
                  void handleSelect(payload);
                }}
              />
            )}
          </section>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Ассистент</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Кликните по слову или фразе на странице. Перевод и объяснение появляются справа.
            </p>

            {!selection ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm leading-7 text-slate-500">
                Пока ничего не выбрано. Нажмите на кликабельную фразу внутри страницы.
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="rounded-[1.5rem] border border-slate-200 bg-[#fffdf7] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Фраза
                  </div>
                  <div className="mt-2 text-xl font-semibold text-slate-950">{selection.text}</div>
                  {selection.context ? (
                    <p className="mt-3 text-sm leading-7 text-slate-600">Контекст: {selection.context}</p>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Перевод
                  </div>
                  <div className="mt-2 text-lg text-slate-800">
                    {selection.translation || "Получаем перевод..."}
                  </div>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCreateCard()}
                    disabled={!selection.translation}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Создать карточку
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExplain()}
                    disabled={isExplaining}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isExplaining ? "Объясняем..." : "Объяснить"}
                  </button>
                </div>

                {selection.explanation ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-sky-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
                      Объяснение
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{selection.explanation}</p>
                  </div>
                ) : null}
              </div>
            )}

            <form onSubmit={handleAsk} className="mt-8 space-y-3 border-t border-slate-200 pt-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Вопрос по текущей странице
                </span>
                <textarea
                  value={chatQuestion}
                  onChange={(event) => setChatQuestion(event.target.value)}
                  placeholder="Например: почему здесь kommen Sie, а не kommst du?"
                  className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <button
                type="submit"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Спросить ассистента
              </button>

              {chatAnswer ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {chatAnswer}
                </div>
              ) : null}
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}
