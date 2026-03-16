"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Tesseract from "tesseract.js";

import { BackButton } from "@/components/back-button";
import { deleteCard, getCard, updateCard, type Card } from "@/lib/cards";

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
      return "Карточка";
  }
}

export default function CardPage() {
  const params = useParams();
  const router = useRouter();

  const cardId = Array.isArray(params.cardId)
    ? params.cardId[0]
    : params.cardId;

  const [card, setCard] = useState<Card | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!cardId) {
        setLoaded(true);
        return;
      }

      const found = await getCard(cardId);
      setCard(found ?? null);
      setLoaded(true);
    }

    load();
  }, [cardId]);

  async function handleDelete() {
    if (!cardId) return;

    await deleteCard(cardId);
    router.push("/cards");
  }

  async function handleOCR() {
    if (!card?.image) return;

    try {
      setOcrLoading(true);

      const result = await Tesseract.recognize(card.image, "eng+rus");
      const text = result?.data?.text?.trim() || "";

      if (!text) {
        alert("Не удалось распознать текст");
        return;
      }

      const updatedCard: Card = {
        ...card,
        content: text,
      };

      await updateCard(updatedCard);
      setCard(updatedCard);
    } catch (error) {
      console.error(error);
      alert("Ошибка OCR");
    } finally {
      setOcrLoading(false);
    }
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
      <div className="max-w-3xl mx-auto">
        <BackButton
          fallbackHref="/cards"
          className="inline-block text-sm text-gray-500 hover:text-black mb-6"
        >
          ← Назад к базе знаний
        </BackButton>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="text-sm text-gray-500 mb-1">
            {getTypeLabel(card.type)}
          </div>

          <h1 className="text-2xl font-bold mb-4">{card.title}</h1>

          {card.image && (
            <div className="mb-6">
              <img
                src={card.image}
                alt={card.title || "Card image"}
                className="rounded-lg border max-h-[500px] w-full object-contain"
              />

              <button
                onClick={handleOCR}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
              >
                {ocrLoading ? "Распознаю текст..." : "Извлечь текст из скриншота"}
              </button>
            </div>
          )}

          <div className="text-gray-700 whitespace-pre-wrap mb-4">
            {card.content}
          </div>

          {card.source && (
            <div className="text-sm text-gray-500 mb-4">
              Источник: {card.source}
            </div>
          )}

          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {card.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
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
      </div>
    </main>
  );
}
