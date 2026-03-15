"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePlateEditor } from "platejs/react";

import {
  type Document,
  getDocument,
  updateDocument,
} from "@/lib/documents";
import PlateDocumentEditor, {
  DOCUMENT_PLATE_PLUGINS,
  insertCardLink,
  PENDING_CARD_LINK_KEY,
  parseHtmlToPlateValue,
  serializePlateEditorHtml,
  type PendingCardLink,
} from "@/components/plate-document-editor";

type Params = {
  id: string;
};

export default function DocumentPage() {
  const params = useParams() as Params;
  const router = useRouter();
  const search = useSearchParams();

  const id = params.id;
  const insertCard = search.get("insertCard");
  const storedDocument = getDocument(id);
  const isBrowser = typeof window !== "undefined";

  const [title, setTitle] = useState(storedDocument?.title ?? "");
  const [tag, setTag] = useState(storedDocument?.tag ?? "");
  const [initialContent] = useState(storedDocument?.content ?? "<p></p>");

  const editor = usePlateEditor(
    {
      enabled: isBrowser,
      plugins: DOCUMENT_PLATE_PLUGINS,
      value: (plateEditor) => parseHtmlToPlateValue(plateEditor, initialContent),
    },
    [id, initialContent, isBrowser]
  );

  const save = useCallback(async () => {
    if (!editor) return;

    const existing = getDocument(id);
    const now = new Date().toISOString();

    const updatedDoc: Document = {
      id,
      title,
      tag,
      content: await serializePlateEditorHtml(editor),
      createdAt: existing?.createdAt,
      updatedAt: now,
    };

    updateDocument(updatedDoc);
  }, [editor, id, tag, title]);

  async function handleCreateCard() {
    if (!editor) return;
    if (editor.api.isCollapsed()) {
      alert("Сначала выдели текст");
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.api.string(selection).trim();

    if (!selection || !selectedText) {
      alert("Сначала выдели текст");
      return;
    }

    await save();

    const pendingCardLink: PendingCardLink = {
      editorId: id,
      selection,
      text: selectedText,
    };

    sessionStorage.setItem(
      PENDING_CARD_LINK_KEY,
      JSON.stringify(pendingCardLink)
    );

    const query = new URLSearchParams({
      text: selectedText,
      tag: selectedText,
      doc: "editor",
      editorId: id,
    });

    router.push(`/cards/new?${query.toString()}`);
  }

  useEffect(() => {
    if (!editor || !insertCard) return;

    let cancelled = false;

    const applyPendingCardLink = async () => {
      const raw = sessionStorage.getItem(PENDING_CARD_LINK_KEY);

      if (!raw) {
        router.replace(`/editor/${id}`);
        return;
      }

      try {
        const pending = JSON.parse(raw) as PendingCardLink;

        if (pending.editorId !== id || !pending.selection) {
          sessionStorage.removeItem(PENDING_CARD_LINK_KEY);
          router.replace(`/editor/${id}`);
          return;
        }

        insertCardLink(editor, insertCard, pending.text, pending.selection);
        await save();

        if (cancelled) return;

        sessionStorage.removeItem(PENDING_CARD_LINK_KEY);
        router.replace(`/editor/${id}`);
      } catch {
        sessionStorage.removeItem(PENDING_CARD_LINK_KEY);
        router.replace(`/editor/${id}`);
      }
    };

    void applyPendingCardLink();

    return () => {
      cancelled = true;
    };
  }, [editor, id, insertCard, router, save]);

  if (!editor) return null;

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/editor"
          className="inline-block text-sm text-gray-500 mb-6"
        >
          ← Назад
        </Link>

        <h1 className="text-3xl font-bold mb-6">Документ</h1>

        <div className="flex gap-4 mb-6">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Название документа"
            className="border p-3 rounded w-full"
          />

          <input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="Тег"
            className="border p-3 rounded w-40"
          />

          <button
            type="button"
            onClick={() => {
              void save();
            }}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Сохранить
          </button>
        </div>

        <PlateDocumentEditor editor={editor} createCard={() => void handleCreateCard()} />
      </div>
    </main>
  );
}
