"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackButton } from "@/components/back-button";
import { getCard, updateCard, type Card } from "@/lib/cards";

export default function EditCardPage() {
  const params = useParams();
  const router = useRouter();

  const cardId = Array.isArray(params.cardId)
    ? params.cardId[0]
    : params.cardId;

  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      if (!cardId) {
        setLoaded(true);
        return;
      }

      const found = await getCard(cardId);

      if (found) {
        setCard(found);
        setTitle(found.title || "");
        setContent(found.content || "");
        setSource(found.source || "");
        setTags((found.tags || []).join(" "));
      }

      setLoaded(true);
    }

    load();
  }, [cardId]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!card) return;

    const updatedCard: Card = {
      ...card,
      title,
      content,
      source,
      tags: tags
        .split(" ")
        .map(tag => tag.trim())
        .filter(Boolean),
    };

    await updateCard(updatedCard);
    router.push(`/cards/${card.id}`);
  }

  if (!loaded) {
    return (
      <main className="p-10 text-gray-500">
        Загрузка карточки...
      </main>
    );
  }

  if (!card) {
    return (
      <main className="p-10">
        <BackButton fallbackHref="/cards" className="text-sm text-gray-500">
          ← Назад
        </BackButton>

        <div className="mt-6 text-gray-500">Карточка не найдена</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-xl mx-auto">
        <BackButton
          fallbackHref={`/cards/${card.id}`}
          className="inline-block text-sm text-gray-500 hover:text-black mb-6"
        >
          ← Назад к карточке
        </BackButton>

        <div className="bg-white p-6 rounded-xl shadow">
          <h1 className="text-2xl font-bold mb-6">Редактировать карточку</h1>

          <form onSubmit={handleSave} className="space-y-4">
            <input
              className="w-full border p-3 rounded"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Заголовок"
            />

            <textarea
              className="w-full border p-3 rounded min-h-40"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Содержание"
            />

            <input
              className="w-full border p-3 rounded"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Источник"
            />

            <input
              className="w-full border p-3 rounded"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Теги через пробел"
            />

            <button className="bg-black text-white px-6 py-3 rounded">
              Сохранить
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
