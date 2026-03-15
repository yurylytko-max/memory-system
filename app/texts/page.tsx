"use client";

import Link from "next/link";
import { useState } from "react";

import { deleteText, getAllTexts, type TextDocument } from "@/lib/texts";

export default function TextsPage() {
  const [texts, setTexts] = useState<TextDocument[]>(() => getAllTexts());

  function handleDelete(id: string) {
    deleteText(id);
    setTexts(getAllTexts());
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_30%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Link
          href="/"
          className="inline-flex w-fit rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Назад
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Тексты
            </h1>
            <p className="text-sm text-slate-500">
              Отдельная среда для длинных текстов на PlateJS.
            </p>
          </div>

          <Link
            href="/texts/new"
            className="inline-flex h-12 items-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Новый текст
          </Link>
        </div>

        {texts.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center text-slate-500 shadow-sm">
            Текстов пока нет
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {texts.map((text) => (
              <div
                key={text.id}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-slate-950">
                    {text.title}
                  </h2>

                  {text.tag && (
                    <p className="mt-2 text-sm text-slate-500">
                      тег: {text.tag}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm font-medium">
                  <Link
                    href={`/texts/${text.id}`}
                    className="text-slate-950 transition hover:text-slate-600"
                  >
                    открыть
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(text.id)}
                    className="text-red-600 transition hover:text-red-500"
                  >
                    удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
