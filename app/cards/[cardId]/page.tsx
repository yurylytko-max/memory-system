"use client";

import { getAllCards, deleteCard } from "@/lib/cards";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CardPage() {
  const params = useParams();
  const router = useRouter();

  const cardId = Array.isArray(params.cardId)
    ? params.cardId[0]
    : params.cardId;

  const [card, setCard] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cards = getAllCards();

    const found = cards.find((c: any) => String(c.id) === String(cardId));

    if (found) {
      setCard(found);
    }

    setLoaded(true);
  }, [cardId]);

  function handleDelete() {
    deleteCard(cardId);
    router.push("/cards");
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
        <Link href="/cards" className="text-sm text-gray-500">
          ← Назад
        </Link>

        <div className="mt-6 text-gray-500">
          Карточка не найдена
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10 max-w-3xl mx-auto">

      <Link
        href="/cards"
        className="inline-block text-sm text-gray-500 hover:text-black mb-6"
      >
        ← Назад к базе знаний
      </Link>

      <div className="bg-white p-6 rounded-xl shadow">

        <div className="text-sm text-gray-500 mb-1">
          {card.type}
        </div>

        <h1 className="text-2xl font-bold mb-4">
          {card.title}
        </h1>

        <div className="text-gray-700 whitespace-pre-wrap mb-4">
          {card.content}
        </div>

        {card.source && (
          <div className="text-sm text-gray-500 mb-4">
            Источник: {card.source}
          </div>
        )}

        {card.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {card.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="text-xs bg-gray-200 px-2 py-1 rounded"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">

          <Link
            href={`/cards/edit/${card.id}`}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Edit
          </Link>

          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Delete
          </button>

        </div>

      </div>

    </main>
  );
}