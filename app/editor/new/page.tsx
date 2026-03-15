"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlateEditor } from "platejs/react";

import PlateDocumentEditor, {
  DOCUMENT_PLATE_PLUGINS,
  parseHtmlToPlateValue,
  serializePlateEditorHtml,
} from "@/components/plate-document-editor";
import { createDocument, type Document } from "@/lib/documents";

export default function NewDocumentPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const isBrowser = typeof window !== "undefined";

  const editor = usePlateEditor({
    enabled: isBrowser,
    plugins: DOCUMENT_PLATE_PLUGINS,
    value: (plateEditor) => parseHtmlToPlateValue(plateEditor, "<p></p>"),
  });

  if (!editor) return null;

  async function saveDocument() {
    if (!editor) return;

    if (!title.trim()) {
      alert("Введите название документа");
      return;
    }

    const now = new Date().toISOString();

    const doc: Document = {
      id: Date.now().toString(),
      title,
      content: await serializePlateEditorHtml(editor),
      tag,
      createdAt: now,
      updatedAt: now,
    };

    createDocument(doc);
    router.push(`/editor/${doc.id}`);
  }

  return (
    <main className="max-w-[900px] mx-auto my-10">
      <button
        type="button"
        onClick={() => router.push("/editor")}
        className="mb-5"
      >
        ← Назад
      </button>

      <h1 className="text-[32px] mb-5">Новый документ</h1>

      <div className="flex gap-2.5 mb-5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Название документа"
          className="flex-1 p-2.5 border border-gray-300 rounded-md"
        />

        <input
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="Тег"
          className="w-[200px] p-2.5 border border-gray-300 rounded-md"
        />

        <button
          type="button"
          onClick={() => {
            void saveDocument();
          }}
          className="px-4 py-2.5 rounded-md bg-black text-white"
        >
          Сохранить
        </button>
      </div>

      <PlateDocumentEditor
        editor={editor}
        createCard={() => {
          alert("Создание карточки доступно после сохранения документа.");
        }}
      />
    </main>
  );
}
