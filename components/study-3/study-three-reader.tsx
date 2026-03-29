"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Card } from "@/lib/cards";
import { clampSelectionText, type StudyThreeBook } from "@/lib/study-3";

type SelectionState = {
  text: string;
  context: string;
  translation: string;
  explanation: string;
};

type TextLayerItem = {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  fontSize: number;
  angle: number;
};

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
  const [fileUrl, setFileUrl] = useState("");
  const [pdfReady, setPdfReady] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [textLayer, setTextLayer] = useState<TextLayerItem[]>([]);
  const [pageText, setPageText] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocumentRef = useRef<any>(null);
  const pdfjsRef = useRef<any>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/study-3/books/${bookId}`, { cache: "no-store" });
      const data = await response.json();

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

      const response = await fetch(`/api/study-3/books/${book.id}/file`, { cache: "no-store" });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Не удалось получить файл учебника.");
        return;
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      setFileUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return nextUrl;
      });

      if (book.mime_type === "application/pdf") {
        setStatus("Подключаем PDF viewer...");
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs";
        pdfjsRef.current = pdfjs;
        const buffer = await blob.arrayBuffer();
        pdfDocumentRef.current = await pdfjs.getDocument({ data: buffer }).promise;
        setPdfReady(true);
      } else {
        setPdfReady(false);
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
    if (!book || book.mime_type !== "application/pdf" || !pdfReady) {
      return;
    }

    void (async () => {
      const pdfjs = pdfjsRef.current;
      const pdfDocument = pdfDocumentRef.current;
      const canvas = canvasRef.current;

      if (!pdfjs || !pdfDocument || !canvas) {
        return;
      }

      setStatus("Рендерим страницу...");

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const context = canvas.getContext("2d");

      if (!context) {
        setError("Не удалось создать canvas.");
        return;
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const textContent = await page.getTextContent();
      const items = (textContent.items ?? []).filter((item: any) => item.str?.trim());
      const flattenedText = items.map((item: any) => item.str).join(" ").replace(/\s+/g, " ").trim();

      const positioned = items.map((item: any, index: number) => {
        const tx = pdfjs.Util.transform(viewport.transform, item.transform);
        const angle = Math.atan2(tx[1], tx[0]);
        const fontSize = Math.max(10, Math.hypot(tx[2], tx[3]));
        const width = Math.max(item.width * viewport.scale, item.str.length * fontSize * 0.45);

        return {
          id: `text-${index}`,
          text: item.str,
          left: tx[4],
          top: tx[5] - fontSize,
          width,
          fontSize,
          angle,
        } satisfies TextLayerItem;
      });

      setViewportSize({ width: viewport.width, height: viewport.height });
      setTextLayer(positioned);
      setPageText(flattenedText);
      setStatus("Можно выделять текст на странице.");
    })();
  }, [book, pageNumber, pdfReady]);

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

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

    if (!text || !book) {
      return;
    }

    const context = buildContext(text);
    setSelection({
      text,
      context,
      translation: "",
      explanation: "",
    });
    setAnswer("");
    setError("");

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
    const data = await response.json();

    if (!response.ok) {
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

  function handleTextMouseUp() {
    const selectionObject = window.getSelection();
    const root = textLayerRef.current;

    if (!selectionObject || selectionObject.isCollapsed || !root) {
      return;
    }

    const anchor = selectionObject.anchorNode;
    const focus = selectionObject.focusNode;

    if ((anchor && !root.contains(anchor)) || (focus && !root.contains(focus))) {
      return;
    }

    const text = clampSelectionText(selectionObject.toString());

    if (!text) {
      return;
    }

    void analyzeSelection(text);
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

  async function handleAsk(event: React.FormEvent<HTMLFormElement>) {
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
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Ассистент не ответил.");
      return;
    }

    setAnswer(data.answer ?? "");
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
            {book?.mime_type === "application/pdf" ? (
              <div className="overflow-auto rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <div
                  className="relative mx-auto bg-white shadow"
                  style={{
                    width: viewportSize.width || 900,
                    minHeight: viewportSize.height || 1100,
                  }}
                >
                  <canvas ref={canvasRef} className="block" />

                  <div
                    ref={textLayerRef}
                    onMouseUp={handleTextMouseUp}
                    className="absolute inset-0 select-text"
                  >
                    {textLayer.map((item) => (
                      <span
                        key={item.id}
                        className="absolute whitespace-pre text-transparent [text-shadow:0_0_0_rgba(0,0,0,0.01)]"
                        style={{
                          left: item.left,
                          top: item.top,
                          width: item.width,
                          fontSize: item.fontSize,
                          transform: `rotate(${item.angle}rad)`,
                          transformOrigin: "left top",
                        }}
                      >
                        {item.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : fileUrl ? (
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
