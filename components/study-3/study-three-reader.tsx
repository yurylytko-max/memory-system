"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { Card } from "@/lib/cards";
import { clampSelectionText, type StudyThreeBook } from "@/lib/study-3";
import {
  isLocalStudyThreeBookId,
  readLocalStudyThreeBook,
  readLocalStudyThreeFile,
} from "@/lib/study-3-local";

type SelectionState = {
  text: string;
  context: string;
  translation: string;
  explanation: string;
};

async function readJsonSafely(response: Response) {
  const raw = await response.text();

  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {
      error: raw.trim() || "Сервер вернул некорректный ответ.",
    };
  }
}

export default function StudyThreeReader({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<StudyThreeBook | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [status, setStatus] = useState("Загружаем учебник...");
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [manualText, setManualText] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [pageText, setPageText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [htmlByPage, setHtmlByPage] = useState<Record<number, string>>({});
  const [isBuildingHtml, setIsBuildingHtml] = useState(false);
  const [contentMode, setContentMode] = useState<"original" | "html">("original");
  const lastSelectionRequestRef = useRef("");

  useEffect(() => {
    void (async () => {
      if (isLocalStudyThreeBookId(bookId)) {
        const localBook = readLocalStudyThreeBook(bookId);

        if (!localBook) {
          setError("Локальный учебник не найден.");
          return;
        }

        setBook(localBook);
        setStatus("Готово к чтению.");
        return;
      }

      const response = await fetch(`/api/study-3/books/${bookId}`, { cache: "no-store" });
      const data = await readJsonSafely(response);

      if (!response.ok) {
        setError(data.error ?? "Не удалось загрузить учебник.");
        return;
      }

      setBook(data.book);
      setStatus("Готово к чтению.");
    })();
  }, [bookId]);

  useEffect(() => {
    if (!book) {
      return;
    }

    void (async () => {
      setError("");
      setSelection(null);
      setAnswer("");
      setQuestion("");
      setHtmlContent("");
      setHtmlByPage({});
      setContentMode("original");
      lastSelectionRequestRef.current = "";

      let blob: Blob | null = null;

      if (isLocalStudyThreeBookId(book.id)) {
        blob = await readLocalStudyThreeFile(book.id);

        if (!blob) {
          setError("Не удалось получить локальный файл учебника.");
          return;
        }
      } else {
        const response = await fetch(`/api/study-3/books/${book.id}/file`, { cache: "no-store" });

        if (!response.ok) {
          const data = await readJsonSafely(response);
          setError(data.error ?? "Не удалось получить файл учебника.");
          return;
        }

        blob = await response.blob();
      }

      const nextUrl = URL.createObjectURL(blob);
      setFileUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return nextUrl;
      });

      if (book.mime_type === "application/pdf") {
        setPageText("");
        setStatus("PDF готов. Откройте страницу и вставьте нужный фрагмент в поле справа.");
      } else {
        setPageText("");
        setStatus("Изображение готово.");
      }
    })();

    return () => {
      setFileUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return "";
      });
    };
  }, [book]);

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    const cachedHtml = htmlByPage[pageNumber] ?? "";
    setHtmlContent(cachedHtml);
  }, [htmlByPage, pageNumber]);

  function buildContext(selectedText: string) {
    const normalized = clampSelectionText(selectedText);

    if (!normalized || !pageText) {
      return normalized;
    }

    const lowerPageText = pageText.toLowerCase();
    const lowerSelection = normalized.toLowerCase();
    const index = lowerPageText.indexOf(lowerSelection);

    if (index === -1) {
      return normalized;
    }

    const start = Math.max(0, index - 80);
    const end = Math.min(pageText.length, index + normalized.length + 80);
    return pageText.slice(start, end).trim();
  }

  async function analyzeSelection(nextText: string) {
    const text = clampSelectionText(nextText);

    if (!text || !book || isTranslating) {
      return;
    }

    if (text === lastSelectionRequestRef.current) {
      return;
    }

    const context = buildContext(text);
    lastSelectionRequestRef.current = text;
    setSelection({
      text,
      context,
      translation: "",
      explanation: "",
    });
    setAnswer("");
    setError("");
    setIsTranslating(true);

    const response = await fetch("/api/study-3/assistant/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        context,
        pageTitle: `Страница ${pageNumber}`,
        bookTitle: book.title,
      }),
    });
    const data = await readJsonSafely(response);
    setIsTranslating(false);

    if (!response.ok) {
      lastSelectionRequestRef.current = "";
      setError(data.error ?? "Не удалось получить перевод.");
      return;
    }

    setSelection({
      text,
      context,
      translation: data.translation ?? "",
      explanation: "",
    });
  }

  function handleHtmlSelection() {
    if (contentMode !== "html") {
      return;
    }

    const nextSelection = window.getSelection();
    const selectedText = clampSelectionText(nextSelection?.toString() ?? "");

    if (!selectedText || selectedText === selection?.text) {
      return;
    }

    void analyzeSelection(selectedText);
    nextSelection?.removeAllRanges();
  }

  async function handleExplain() {
    if (!selection || !book) {
      return;
    }

    setIsExplaining(true);

    const response = await fetch("/api/study-3/assistant/explain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: selection.text,
        context: selection.context,
        pageTitle: `Страница ${pageNumber}`,
        bookTitle: book.title,
      }),
    });
    const data = await readJsonSafely(response);
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
    if (!selection || !selection.translation || !book) {
      return;
    }

    const payload: Card = {
      id: `study3-${Date.now()}`,
      title: selection.text,
      content: selection.translation,
      source: `${book.title} · стр. ${pageNumber}`,
      type: "book",
      sphere: "Учебники 3.0",
      tags: ["study-3", "deutsch"],
      image: null,
    };

    const response = await fetch("/api/cards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Не удалось создать карточку.");
      return;
    }

    setStatus("Карточка сохранена в Cards.");
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim() || !book) {
      return;
    }

    const response = await fetch("/api/study-3/assistant/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        selectedText: selection?.text ?? "",
        context: selection?.context ?? "",
        pageTitle: `Страница ${pageNumber}`,
        bookTitle: book.title,
      }),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      setError(data.error ?? "Ассистент не ответил.");
      return;
    }

    setAnswer(data.answer ?? "");
  }

  async function handleBuildHtml() {
    if (!book) {
      return;
    }

    const cachedHtml = htmlByPage[pageNumber];

    if (cachedHtml) {
      setHtmlContent(cachedHtml);
      setContentMode("html");
      setStatus("HTML страницы уже готов.");
      setError("");
      return;
    }

    setIsBuildingHtml(true);
    setError("");

    try {
      let payload: Record<string, unknown> = {
        pageNumber,
      };

      if (book.mime_type === "application/pdf" && fileUrl) {
        setStatus("Подготавливаем PDF-страницу для Gemini...");
        const pdfBuffer = await fetch(fileUrl).then((response) => response.arrayBuffer());
        const { PDFDocument } = await import("pdf-lib");
        const sourceDocument = await PDFDocument.load(pdfBuffer);
        const totalPages = sourceDocument.getPageCount();
        const pageIndex = Math.max(0, Math.min(totalPages - 1, pageNumber - 1));
        const singlePageDocument = await PDFDocument.create();
        const [page] = await singlePageDocument.copyPages(sourceDocument, [pageIndex]);
        singlePageDocument.addPage(page);

        const pageBytes = await singlePageDocument.save();
        let binary = "";

        for (const byte of pageBytes) {
          binary += String.fromCharCode(byte);
        }

        const fileBase64 = btoa(binary);

        payload = {
          pageNumber,
          fileBase64,
          fileMimeType: "application/pdf",
        };
      }

      const response = await fetch(`/api/study-3/books/${book.id}/html`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          bookTitle: book.title,
        }),
      });
      const raw = await response.text();
      const data = raw.trim() ? JSON.parse(raw) : {};

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось построить HTML страницы.");
      }

      const nextHtml = typeof data.html === "string" ? data.html : "";

      setHtmlByPage((current) => ({
        ...current,
        [pageNumber]: nextHtml,
      }));
      setHtmlContent(nextHtml);
      setContentMode("html");
      setStatus("HTML страницы готов.");
    } catch (htmlError) {
      setError(
        htmlError instanceof Error
          ? htmlError.message
          : "Не удалось построить HTML страницы."
      );
    } finally {
      setIsBuildingHtml(false);
    }
  }

  const progressLabel = useMemo(() => {
    if (!book) {
      return "0 / 0";
    }

    return `${pageNumber} / ${book.page_count}`;
  }, [book, pageNumber]);

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/study-3"
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← К библиотеке
            </Link>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {book?.title ?? "Учебник"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Выделите текст на странице, чтобы получить перевод и объяснение только по нужному фрагменту.
            </p>
          </div>

          <Link
            href="/cards"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Открыть Cards
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
                disabled={!book || isBuildingHtml}
                onClick={() => void handleBuildHtml()}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isBuildingHtml ? "Строим HTML..." : "Построить HTML"}
              </button>
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContentMode("original")}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  contentMode === "original"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Оригинал
              </button>
              <button
                type="button"
                disabled={!htmlContent}
                onClick={() => setContentMode("html")}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  contentMode === "html"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                }`}
              >
                HTML
              </button>
            </div>

            {contentMode === "html" ? (
              htmlContent ? (
                <div className="rounded-[1.75rem] border border-slate-200 bg-[#fffdf7] p-6">
                  <div
                    className="prose prose-slate max-w-none"
                    onMouseUp={handleHtmlSelection}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              ) : (
                <div className="flex min-h-[55vh] items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">
                  HTML страницы ещё не построен.
                </div>
              )
            ) : contentMode === "original" && book?.mime_type === "application/pdf" ? (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50">
                  <iframe
                    key={`${fileUrl}-${pageNumber}`}
                    src={`${fileUrl}#page=${pageNumber}&view=FitH`}
                    title={book?.title ?? "Учебник"}
                    className="h-[78vh] w-full bg-white"
                  />
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-[#fffdf7] p-4">
                  <div className="text-sm font-medium text-slate-900">
                    Скопируйте нужный фрагмент со страницы и вставьте сюда
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Gemini получает только этот короткий фрагмент, а не всю страницу.
                  </p>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row">
                    <input
                      value={manualText}
                      onChange={(event) => setManualText(event.target.value)}
                      placeholder="Например: Guten Tag, ich heiße Lara."
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => void analyzeSelection(manualText)}
                      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Разобрать фразу
                    </button>
                  </div>
                </div>
              </div>
            ) : contentMode === "original" && fileUrl ? (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50">
                  <img src={fileUrl} alt={book?.title ?? "Учебник"} className="w-full object-contain" />
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-[#fffdf7] p-4">
                  <div className="text-sm font-medium text-slate-900">
                    Для изображения введите нужную фразу вручную
                  </div>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row">
                    <input
                      value={manualText}
                      onChange={(event) => setManualText(event.target.value)}
                      placeholder="Например: Guten Tag, ich heiße Lara."
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => void analyzeSelection(manualText)}
                      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Разобрать фразу
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[55vh] items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">
                Подготавливаем страницу...
              </div>
            )}
          </section>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Ассистент</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Справа появляется только выбранный фрагмент, а не весь учебник целиком.
            </p>

            {!selection ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm leading-7 text-slate-500">
                Выделите текст мышкой на PDF или введите фразу вручную для изображения.
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="rounded-[1.5rem] border border-slate-200 bg-[#fffdf7] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Фрагмент
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
                  Вопрос по текущему фрагменту
                </span>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Например: почему здесь formal, а не informal?"
                  className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <button
                type="submit"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Спросить ассистента
              </button>

              {answer ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {answer}
                </div>
              ) : null}
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}
