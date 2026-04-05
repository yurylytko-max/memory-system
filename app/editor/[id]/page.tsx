"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { useEditor, EditorContent } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";

import {
  getDocument,
  updateDocument,
  Document,
} from "@/lib/documents";

type Params = {
  id: string;
};

const PENDING_CARD_LINK_KEY = "pending_card_link";

export default function DocumentPage() {
  const params = useParams() as Params;
  const router = useRouter();
  const search = useSearchParams();

  const id = params.id;
  const insertCard = search.get("insertCard");
  const initialDoc = getDocument(id);

  const [title, setTitle] = useState(() => initialDoc?.title ?? "");
  const [tag, setTag] = useState(() => initialDoc?.tag ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TiptapLink.configure({
        openOnClick: false,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[520px] outline-none text-[18px] leading-8",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const doc = getDocument(id);

    if (!doc) {
      return;
    }

    editor.commands.setContent(doc.content ?? "");
  }, [editor, id]);

  function save() {
    if (!editor) return;

    const existing = getDocument(id);
    const now = new Date().toISOString();

    const updatedDoc: Document = {
      id,
      title,
      tag,
      content: editor.getHTML(),
      createdAt: existing?.createdAt,
      updatedAt: now,
    };

    updateDocument(updatedDoc);
  }

  function handleCreateCard() {
    if (!editor) return;

    const { from, to } = editor.state.selection;

    if (from === to) {
      alert("Сначала выдели текст");
      return;
    }

    const selectedText = editor.state.doc.textBetween(from, to, " ").trim();

    if (!selectedText) {
      alert("Сначала выдели текст");
      return;
    }

    save();

    sessionStorage.setItem(
      PENDING_CARD_LINK_KEY,
      JSON.stringify({
        editorId: id,
        from,
        to,
        text: selectedText,
      })
    );

    const query = new URLSearchParams({
      text: selectedText,
      tag,
      doc: `editor:${id}`,
      editorId: id,
    });

    router.push(`/cards/new?${query.toString()}`);
  }

  useEffect(() => {
    if (!editor) return;
    if (!insertCard) return;

    const raw = sessionStorage.getItem(PENDING_CARD_LINK_KEY);

    if (!raw) {
      router.replace(`/editor/${id}`);
      return;
    }

    try {
      const pending = JSON.parse(raw);

      if (pending.editorId !== id) {
        sessionStorage.removeItem(PENDING_CARD_LINK_KEY);
        router.replace(`/editor/${id}`);
        return;
      }

      const docSize = editor.state.doc.content.size;
      const safeFrom = Math.max(1, Math.min(pending.from, docSize));
      const safeTo = Math.max(safeFrom, Math.min(pending.to, docSize));

      const transaction = editor.state.tr.setSelection(
        TextSelection.create(editor.state.doc, safeFrom, safeTo)
      );

      editor.view.dispatch(transaction);

      editor
        .chain()
        .focus()
        .setLink({ href: `/cards/${insertCard}` })
        .run();

      const existing = getDocument(id);
      const now = new Date().toISOString();

      const updatedDoc: Document = {
        id,
        title,
        tag,
        content: editor.getHTML(),
        createdAt: existing?.createdAt,
        updatedAt: now,
      };

      updateDocument(updatedDoc);
      sessionStorage.removeItem(PENDING_CARD_LINK_KEY);
      router.replace(`/editor/${id}`);
    } catch {
      sessionStorage.removeItem(PENDING_CARD_LINK_KEY);
      router.replace(`/editor/${id}`);
    }
  }, [editor, insertCard, id, router, title, tag]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `px-3 py-1 border rounded text-sm ${
      active ? "bg-gray-200" : "bg-white"
    }`;

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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название документа"
            className="border p-3 rounded w-full"
          />

          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Тег"
            className="border p-3 rounded w-40"
          />

          <button
            onClick={save}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Сохранить
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={btn(editor.isActive("bold"))}
          >
            B
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={btn(editor.isActive("italic"))}
          >
            I
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={btn(editor.isActive("underline"))}
          >
            U
          </button>

          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={btn(editor.isActive("heading", { level: 1 }))}
          >
            H1
          </button>

          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={btn(editor.isActive("heading", { level: 2 }))}
          >
            H2
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={btn(editor.isActive("bulletList"))}
          >
            •
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={btn(editor.isActive("orderedList"))}
          >
            1.
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={btn(editor.isActive("blockquote"))}
          >
            &quot;
          </button>

          <button
            onClick={() => editor.chain().focus().undo().run()}
            className={btn(false)}
          >
            Undo
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            className={btn(false)}
          >
            Redo
          </button>

          <button
            onClick={handleCreateCard}
            className="px-3 py-1 border rounded text-sm bg-yellow-200"
          >
            Card
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2">
          <EditorContent editor={editor} />
        </div>
      </div>
    </main>
  );
}
