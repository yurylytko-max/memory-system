"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePlateEditor } from "platejs/react";

import PlateTextEditor, {
  insertTextCardLink,
  parseHtmlToTextValue,
  PENDING_TEXT_CARD_LINK_KEY,
  serializeTextEditorHtml,
  TEXTS_PLATE_PLUGINS,
  type PendingTextCardLink,
} from "@/components/texts/plate-text-editor";
import { getText, updateText, type TextDocument } from "@/lib/texts";

type Params = {
  id: string;
};

export default function TextPage() {
  const params = useParams() as Params;
  const router = useRouter();
  const search = useSearchParams();
  const id = params.id;
  const insertCard = search.get("insertCard");
  const isBrowser = typeof window !== "undefined";
  const [storedText, setStoredText] = useState<TextDocument | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [initialContent, setInitialContent] = useState("<p></p>");

  useEffect(() => {
    async function loadText() {
      const text = await getText(id);

      if (!text) {
        setStoredText(null);
        setLoaded(true);
        return;
      }

      setStoredText(text);
      setTitle(text.title ?? "");
      setTag(text.tag ?? "");
      setInitialContent(text.content ?? "<p></p>");
      setLoaded(true);
    }

    void loadText();
  }, [id]);

  const editor = usePlateEditor(
    {
      enabled: isBrowser,
      plugins: TEXTS_PLATE_PLUGINS,
      value: (plateEditor) => parseHtmlToTextValue(plateEditor, initialContent),
    },
    [id, initialContent, isBrowser, storedText?.updatedAt]
  );
  const activeEditor = editor;

  const save = useCallback(async () => {
    if (!activeEditor || !storedText) return;

    const now = new Date().toISOString();

    const updatedText: TextDocument = {
      id,
      title,
      tag,
      content: await serializeTextEditorHtml(activeEditor),
      createdAt: storedText.createdAt,
      updatedAt: now,
    };

    await updateText(updatedText);
    setStoredText(updatedText);
  }, [activeEditor, id, storedText, tag, title]);

  async function handleCreateCard() {
    if (!activeEditor) return;

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

    await save();

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

  useEffect(() => {
    if (!activeEditor || !insertCard) return;

    let cancelled = false;

    const applyPendingCardLink = async () => {
      const raw = sessionStorage.getItem(PENDING_TEXT_CARD_LINK_KEY);

      if (!raw) {
        router.replace(`/texts/${id}`);
        return;
      }

      try {
        const pending = JSON.parse(raw) as PendingTextCardLink;

        if (pending.textId !== id || !pending.selection) {
          sessionStorage.removeItem(PENDING_TEXT_CARD_LINK_KEY);
          router.replace(`/texts/${id}`);
          return;
        }

        insertTextCardLink(activeEditor, insertCard, pending.text, pending.selection);
        await save();

        if (cancelled) return;

        sessionStorage.removeItem(PENDING_TEXT_CARD_LINK_KEY);
        router.replace(`/texts/${id}`);
      } catch {
        sessionStorage.removeItem(PENDING_TEXT_CARD_LINK_KEY);
        router.replace(`/texts/${id}`);
      }
    };

    void applyPendingCardLink();

    return () => {
      cancelled = true;
    };
  }, [activeEditor, id, insertCard, router, save]);

  if (!loaded || !storedText || !editor) return null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_30%,#ffffff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Link
          href="/texts"
          className="inline-flex w-fit rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Назад
        </Link>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Текст
          </h1>
          <p className="text-sm text-slate-500">
            PlateJS-редактор в отдельной среде.
          </p>
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
              void save();
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
