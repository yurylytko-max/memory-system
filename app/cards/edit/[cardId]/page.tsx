"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAllCards } from "@/lib/cards";

export default function EditCardPage() {
  const params = useParams();
  const router = useRouter();

  const [card, setCard] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    const cards = getAllCards();
    const found = cards.find((c: any) => c.id === params.cardId);

    if (found) {
      setCard(found);
      setTitle(found.title || "");
      setContent(found.content || "");
      setSource(found.source || "");
      setTags((found.tags || []).join(" "));
    }
  }, []);

  function handleSave(e: any) {
    e.preventDefault();

    const saved = localStorage.getItem("cards");
    if (!saved) return;

    const cards = JSON.parse(saved);

    const updated = cards.map((c: any) => {
      if (c.id === params.cardId) {
        return {
          ...c,
          title,
          content,
          source,
          tags: tags.split(" ").filter(Boolean)
        };
      }

      return c;
    });

    localStorage.setItem("cards", JSON.stringify(updated));

    router.push(`/cards/${params.cardId}`);
  }

  if (!card) {
    return <div className="p-10">Карточка не найдена</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10 max-w-xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">
        Редактировать карточку
      </h1>

      <form onSubmit={handleSave} className="space-y-4">

        <input
          className="w-full border p-3 rounded"
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded"
          value={content}
          onChange={(e)=>setContent(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded"
          value={source}
          onChange={(e)=>setSource(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded"
          value={tags}
          onChange={(e)=>setTags(e.target.value)}
        />

        <button className="bg-black text-white px-6 py-3 rounded">
          Сохранить
        </button>

      </form>

    </main>
  );
}