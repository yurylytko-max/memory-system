"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { BackButton } from "@/components/back-button";
import {
  getLegacyTexts,
  getText,
  migrateLegacyTextsToServer,
  type TextDocument,
} from "@/lib/texts";

type Params = {
  id: string;
};

export default function TextPreviewPage() {
  const params = useParams() as Params;
  const id = params.id;

  const [text, setText] = useState<TextDocument | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadText() {
      let currentText = await getText(id);

      if (!currentText) {
        const legacyTexts = getLegacyTexts();
        const legacyMatch = legacyTexts.find((item) => item.id === id);

        if (legacyMatch) {
          await migrateLegacyTextsToServer();
          currentText = legacyMatch;
        }
      }

      setText(currentText ?? null);
      setLoaded(true);
    }

    void loadText();
  }, [id]);

  if (!loaded) {
    return (
      <main className="p-10 text-gray-500">
        Загрузка текста...
      </main>
    );
  }

  if (!text) {
    return (
      <main className="p-10">
        <BackButton fallbackHref="/texts" className="text-sm text-gray-500">
          ← Назад
        </BackButton>

        <div className="mt-6 text-gray-500">Текст не найден</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_30%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <BackButton
          fallbackHref="/texts"
          className="inline-flex w-fit rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Назад
        </BackButton>

        <div className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {text.title}
            </h1>

            {text.tag && (
              <p className="mt-2 text-sm text-slate-500">
                тег: {text.tag}
              </p>
            )}
          </div>

          <Link
            href={`/texts/${text.id}/edit`}
            className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Редактировать
          </Link>
        </div>

        <article className="rounded-[32px] border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] md:px-10 md:py-10">
          <div
            className="mx-auto max-w-3xl text-[17px] leading-8 text-slate-800 [&_a]:text-slate-950 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mt-10 [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1:first-child]:mt-0 [&_h2]:mt-8 [&_h2]:text-3xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-2xl [&_h3]:font-semibold [&_hr]:my-8 [&_hr]:border-slate-200 [&_li]:mt-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_strong]:font-semibold [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: text.content || "<p></p>" }}
          />
        </article>
      </div>
    </main>
  );
}
