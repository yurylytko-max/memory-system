"use client";

import { createCard } from "@/lib/cards";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function NewCardPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [type, setType] = useState("thought");

  function handleSave() {
    const id = crypto.randomUUID();

    const card = {
      id,
      title,
      content,
      source,
      type,
      tags: tags
        .split(" ")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    createCard(card);

    router.push(`/cards/${id}`);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10 max-w-xl mx-auto">
      <Link href="/cards" className="text-sm text-gray-500">
        ← Назад
      </Link>

      <h1 className="text-2xl font-bold mb-6 mt-4">Новая карточка</h1>

      <div className="space-y-4">

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border p-3 rounded w-full"
        >
          <option value="thought">Мысль</option>
          <option value="quote">Цитата</option>
          <option value="book">Книга</option>
          <option value="music">Музыка</option>
          <option value="idea">Идея</option>
          <option value="recipe">Рецепт</option>
          <option value="screenshot">Скриншот</option>
        </select>

        <input
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-3 rounded w-full"
        />

        <textarea
          placeholder="Содержание"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border p-3 rounded w-full h-32"
        />

        <input
          placeholder="Источник"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border p-3 rounded w-full"
        />

        <input
          placeholder="Теги через пробел"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="border p-3 rounded w-full"
        />

        <button
          onClick={handleSave}
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
        >
          Сохранить
        </button>
      </div>
    </main>
  );
}