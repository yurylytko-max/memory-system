"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlateEditor } from "platejs/react";

import { BackButton } from "@/components/back-button";
import PlateTextEditor, {
  DEFAULT_TEXT_HTML,
  PENDING_TEXT_CARD_LINK_KEY,
  parseHtmlToTextValue,
  serializeTextEditorHtml,
  TEXTS_PLATE_PLUGINS,
  type PendingTextCardLink,
} from "@/components/texts/plate-text-editor";
import { createText, type TextDocument } from "@/lib/texts";

export default function NewTextPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const isBrowser = typeof window !== "undefined";

  const editor = usePlateEditor({
    enabled: isBrowser,
    plugins: TEXTS_PLATE_PLUGINS,
    value: (plateEditor) => parseHtmlToTextValue(plateEditor, DEFAULT_TEXT_HTML),
  });

  if (!editor) return null;

  const activeEditor = editor;

  async function saveText() {
    if (!title.trim()) {
      alert("Введите название текста");
      return;
    }

    const now = new Date().toISOString();

    const text: TextDocument = {
      id: Date.now().toString(),
      title,
      content: await serializeTextEditorHtml(activeEditor),
      tag,
      createdAt: now,
      updatedAt: now,
    };

    await createText(text);
    router.push(`/texts/${text.id}`);
  }

  async function handleCreateCard() {
    if (activeEditor.api.isCollapsed()) {
      alert("Сначала выдели текст");
      return;
    }

    const selection = activeEditor.selection;
    const selectedText = activeEditor.api.string(selection).trim();

    if (!selection || !selectedText) {
      alert("Сначала выдели текст");
      return;
    }

    if (!title.trim()) {
      alert("Сначала укажи название текста");
      return;
    }

    const now = new Date().toISOString();
    const id = Date.now().toString();

    const text: TextDocument = {
      id,
      title,
      content: await serializeTextEditorHtml(activeEditor),
      tag,
      createdAt: now,
      updatedAt: now,
    };

    await createText(text);

    const pendingCardLink: PendingTextCardLink = {
      selection,
      text: selectedText,
      textId: id,
    };

    sessionStorage.setItem(
      PENDING_TEXT_CARD_LINK_KEY,
      JSON.stringify(pendingCardLink)
    );

    const query = new URLSearchParams({
      text: selectedText,
      tag: selectedText,
      doc: "texts",
      textId: id,
    });

    router.push(`/cards/new?${query.toString()}`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_30%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <BackButton
            fallbackHref="/texts"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Назад
          </BackButton>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Новый текст
            </h1>
            <p className="text-sm text-slate-500">
              Изолированная среда с PlateJS как основным редактором.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Название текста"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />

          <input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="Тег"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />

          <button
            type="button"
            onClick={() => {
              void saveText();
            }}
            className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Сохранить
          </button>
        </div>

        <PlateTextEditor editor={activeEditor} createCard={() => void handleCreateCard()} />
      </div>
    </main>
  );
}
