"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Document,
  getAllDocuments,
  deleteDocument,
} from "@/lib/documents";

export default function EditorHome() {
  const [docs, setDocs] = useState<Document[]>(() => getAllDocuments());

  function handleDelete(id: string) {
    deleteDocument(id);

    const updated = getAllDocuments();
    setDocs(updated);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10 max-w-5xl mx-auto">

      <Link
        href="/"
        className="inline-block text-sm text-gray-500 hover:text-black mb-6"
      >
        ← Назад
      </Link>

      <h1 className="text-3xl font-bold mb-6">
        Писательское пространство
      </h1>

      <Link
        href="/editor/new"
        className="inline-block bg-black text-white px-4 py-2 rounded mb-8"
      >
        Новый документ
      </Link>

      <div className="grid grid-cols-2 gap-6">

        {docs.length === 0 && (
          <div className="text-gray-500">
            Документов пока нет
          </div>
        )}

        {docs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white p-6 rounded-xl shadow"
          >
            <div className="text-xl font-semibold mb-2">
              {doc.title}
            </div>

            {doc.tag && (
              <div className="text-sm text-gray-500 mb-4">
                тег: {doc.tag}
              </div>
            )}

            <div className="flex gap-4 text-sm">

              <Link
                href={`/editor/${doc.id}`}
                className="text-blue-600 hover:underline"
              >
                открыть
              </Link>

              <button
                onClick={() => handleDelete(doc.id)}
                className="text-red-600 hover:underline"
              >
                удалить
              </button>

            </div>
          </div>
        ))}

      </div>

    </main>
  );
}
