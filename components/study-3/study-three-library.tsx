"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { upload } from "@vercel/blob/client";

import type { StudyThreeBook } from "@/lib/study-3";
import {
  deleteLocalStudyThreeBook,
  isLocalStudyThreeBookId,
  listLocalStudyThreeBooks,
} from "@/lib/study-3-local";

async function readJsonSafely(response: Response) {
  const raw = await response.text();

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(raw.trim() || "Сервер вернул некорректный ответ.");
  }
}

export default function StudyThreeLibrary() {
  const [books, setBooks] = useState<StudyThreeBook[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [deletingBookId, setDeletingBookId] = useState("");

  useEffect(() => {
    void loadBooks();
  }, []);

  async function loadBooks() {
    const response = await fetch("/api/study-3/books", { cache: "no-store" });
    const data = await readJsonSafely(response);
    const remoteBooks = Array.isArray(data.books) ? data.books : [];
    const localBooks = typeof window === "undefined" ? [] : listLocalStudyThreeBooks();
    setBooks([...localBooks, ...remoteBooks]);
    setLoaded(true);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!file) {
      setError("Сначала выберите PDF или изображение.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(3);
    setUploadStatus("Подготавливаем файл...");
    setError("");

    try {
      setUploadProgress(10);
      setUploadStatus("Загружаем файл в Blob...");

      const blobResult = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/study-3/blob",
        onUploadProgress: (progress) => {
          setUploadProgress(Math.max(10, Math.min(92, Math.round(progress))));
          setUploadStatus(`Загружаем файл: ${Math.round(progress)}%`);
        },
      });

      setUploadProgress(95);
      setUploadStatus("Сохраняем учебник в библиотеке...");

      let pageCount = 1;

      if (file.type === "application/pdf") {
        const bytes = await file.arrayBuffer();
        const { PDFDocument } = await import("pdf-lib");
        const document = await PDFDocument.load(bytes);
        pageCount = Math.max(1, document.getPageCount());
      }

      const nextTitle = title.trim() || file.name.replace(/\.[^.]+$/, "") || "Учебник";

      const finishResponse = await fetch("/api/study-3/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          pageCount,
          fileUrl: blobResult.url,
        }),
      });
      const data = await readJsonSafely(finishResponse);

      if (!finishResponse.ok) {
        throw new Error(data.error ?? "Не удалось сохранить учебник.");
      }

      setUploadProgress(100);
      setUploadStatus("Файл загружен.");

      setTitle("");
      setFile(null);
      const input = form?.querySelector<HTMLInputElement>('input[type="file"]');

      if (input) {
        input.value = "";
      }

      await loadBooks();
      setUploadStatus("Учебник добавлен в библиотеку.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Не удалось загрузить учебник."
      );
      setUploadStatus("Загрузка не удалась.");
    } finally {
      setIsUploading(false);
      window.setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus("");
      }, 1200);
    }
  }

  async function handleDeleteBook(book: StudyThreeBook) {
    const entityLabel = book.mime_type.startsWith("image/") ? "страницу" : "учебник";

    if (!window.confirm(`Удалить ${entityLabel} "${book.title}"?`)) {
      return;
    }

    setDeletingBookId(book.id);
    setError("");

    try {
      if (isLocalStudyThreeBookId(book.id)) {
        await deleteLocalStudyThreeBook(book.id);
      } else {
        const response = await fetch(`/api/study-3/books/${book.id}`, {
          method: "DELETE",
        });
        const data = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось удалить запись.");
        }
      }

      await loadBooks();
      setUploadStatus(book.mime_type.startsWith("image/") ? "Страница удалена." : "Учебник удалён.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить запись.");
    } finally {
      setDeletingBookId("");
    }
  }

  return (
    <main
      className="min-h-screen bg-white px-6 py-10"
      data-testid={loaded ? "study-library-loaded" : "study-library-loading"}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Study 3.0
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-950">Учебники 3.0</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Загрузите учебник, откройте страницу и работайте с текстом прямо в контексте книги.
              Ассистент справа помогает только по выбранному фрагменту, а найденные слова уходят в
              отдельный словарь учебников.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/study-3/vocabulary"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Открыть словарь
            </Link>
            <Link
              href="/study-3/vocabulary/review"
              className="rounded-full border border-slate-300 bg-slate-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Учить лексику
            </Link>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={handleUpload}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
            data-testid="study-upload-form"
          >
            <h2 className="text-2xl font-semibold text-slate-950">Добавить учебник</h2>
            <p className="mt-2 text-sm text-slate-600">
              Можно загрузить PDF или отдельное изображение страницы.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Название</span>
                <input
                  data-testid="study-title-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Например, Schritte A1.1"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Файл</span>
                <input
                  type="file"
                  data-testid="study-file-input"
                  accept="application/pdf,image/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white"
                />
              </label>

              {error ? (
                <div className="text-sm text-red-600" data-testid="study-upload-error">
                  {error}
                </div>
              ) : null}

              {isUploading || uploadProgress > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{uploadStatus || "Загрузка..."}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isUploading}
                data-testid="study-upload-button"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isUploading ? "Загружаем..." : "Добавить в библиотеку"}
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Библиотека</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Откройте нужный учебник и начните работать со страницами.
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                {books.length} {books.length === 1 ? "книга" : books.length < 5 ? "книги" : "книг"}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2" data-testid="study-books-list">
              {books.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 md:col-span-2">
                  Здесь пока пусто.
                </div>
              ) : (
                books.map((book) => {
                  const isPageEntry = book.mime_type.startsWith("image/");

                  return (
                    <article
                      key={book.id}
                      className="rounded-[1.75rem] border border-slate-200 bg-[#fffdf7] p-5"
                      data-testid={`study-book-card-${book.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950">{book.title}</h3>
                          <p className="mt-2 text-sm text-slate-500">{book.file_name}</p>
                        </div>
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                          {isPageEntry ? "Страница" : "Учебник"}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center gap-4 text-sm text-slate-600">
                        <span>{book.page_count} стр.</span>
                        <span>•</span>
                        <span>{new Date(book.updated_at).toLocaleDateString("ru-RU")}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/study-3/${book.id}`}
                          data-testid={`study-book-link-${book.id}`}
                          className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          Открыть
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDeleteBook(book)}
                          disabled={deletingBookId === book.id}
                          data-testid={`study-book-delete-${book.id}`}
                          className="rounded-2xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingBookId === book.id ? "Удаляем..." : "Удалить"}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
