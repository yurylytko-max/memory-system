"use client";

import { useParams } from "next/navigation";
import { getAllCards } from "@/lib/cards";
import Link from "next/link";

function getTypeLabel(type: string) {
  switch (type) {
    case "thought":
      return "Мысль";
    case "quote":
      return "Цитата";
    case "book":
      return "Книга";
    case "music":
      return "Музыка";
    case "idea":
      return "Идея";
    case "recipe":
      return "Рецепт";
    case "screenshot":
      return "Скриншот";
    default:
      return type;
  }
}

export default function TagPage() {
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);

  const cards = getAllCards();

  const filtered = cards.filter((card: any) =>
    card.tags && card.tags.includes(tag)
  );

  return (
    <main className="min-h-screen bg-gray-100 p-10 max-w-4xl mx-auto">

      <Link
        href="/cards"
        className="text-sm text-gray-500 hover:text-black"
      >
        ← Назад к базе знаний
      </Link>

      <h1 className="text-3xl font-bold mt-4 mb-8">
        #{tag}
      </h1>

      {filtered.length === 0 && (
        <p className="text-gray-500">
          Нет карточек с этим тегом
        </p>
      )}

      <div className="space-y-4">
        {filtered.map((card: any) => (
          <Link
            key={card.id}
            href={`/cards/${card.id}`}
            className="block"
          >
            <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl hover:scale-[1.01] transition cursor-pointer">

              <div className="text-sm text-gray-500 mb-1">
                {getTypeLabel(card.type)}
              </div>

              {card.title && (
                <div className="text-xl font-semibold">
                  {card.title}
                </div>
              )}

              {card.content && (
                <div className="text-gray-700 mt-2 mb-3">
                  {card.content}
                </div>
              )}

              {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs bg-gray-200 px-2 py-1 rounded"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

            </div>
          </Link>
        ))}
      </div>

    </main>
  );
}