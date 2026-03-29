"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import type { StudyThreeBook } from "@/lib/study-3";

export default function StudyThreeLibrary() {
  const [books, setBooks] = useState<StudyThreeBook[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    void loadBooks();
  }, []);

  async function loadBooks() {
    const response = await fetch("/api/study-3/books", { cache: "no-store" });
    const data = await response.json();
    setBooks(Array.isArray(data.books) ? data.books : []);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Сначала выберите PDF или изображение.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());

      const response = await fetch("/api/study-3/books", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Не удалось загрузить учебник.");
        return;
      }

      setTitle("");
      setFile(null);
      const input = event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');

      if (input) {
        input.value = "";
      }

      await loadBooks();
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Study 3.0
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-950">Учебники 3.0</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Загрузите учебник, откройте страницу и работайте с текстом прямо в контексте книги.
              Ассистент справа помогает только по выбранному фрагменту, а карточки создаются вручную.
            </p>
          </div>

          <Link
            href="/cards"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Открыть Cards
          </Link>
        </div>

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={handleUpload}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-semibold text-slate-950">Добавить учебник</h2>
            <p className="mt-2 text-sm text-slate-600">
              Можно загрузить PDF или отдельное изображение страницы.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Название</span>
                <input
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
                  accept="application/pdf,image/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white"
                />
              </label>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <button
                type="submit"
                disabled={isUploading}
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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {books.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 md:col-span-2">
                  Здесь пока пусто.
                </div>
              ) : (
                books.map((book) => (
                  <Link
                    key={book.id}
                    href={`/study-3/${book.id}`}
                    className="rounded-[1.75rem] border border-slate-200 bg-[#fffdf7] p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{book.title}</h3>
                        <p className="mt-2 text-sm text-slate-500">{book.file_name}</p>
                      </div>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                        {book.mime_type === "application/pdf" ? "PDF" : "Image"}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-4 text-sm text-slate-600">
                      <span>{book.page_count} стр.</span>
                      <span>•</span>
                      <span>{new Date(book.updated_at).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
