"use client";

import { getAllCards } from "@/lib/cards";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

function normalizeCard(card: any, index: number) {
  const safeId =
    card?.id && String(card.id).trim() !== ""
      ? String(card.id)
      : `legacy-${index}-${card?.title ?? "card"}`;

  return {
    ...card,
    id: safeId,
    title: card?.title ?? "",
    content: card?.content ?? "",
    source: card?.source ?? "",
    type: card?.type ?? "thought",
    tags: Array.isArray(card?.tags) ? card.tags : [],
  };
}

export default function CardsPage() {

  const [cards, setCards] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/cards");
      const data = await res.json();
    
      setCards(Array.isArray(data) ? data : []);
    }
  
    load();
  }, []);

  const normalizedCards = useMemo(() => {
    return cards.map((card, index) => normalizeCard(card, index));
  }, [cards]);

  const allTags = useMemo(() => {
    return Array.from(
      new Set(normalizedCards.flatMap((card: any) => card.tags || []))
    );
  }, [normalizedCards]);

  const filtered = useMemo(() => {
    return normalizedCards.filter((card: any) => {
      const text = `${card.title} ${card.content} ${card.source}`.toLowerCase();
      const searchMatch = text.includes(search.toLowerCase());
      const typeMatch = typeFilter === "all" || card.type === typeFilter;
      return searchMatch && typeMatch;
    });
  }, [normalizedCards, search, typeFilter]);

  return (
    <main className="min-h-screen bg-muted/40 p-10">

      <div className="max-w-5xl mx-auto">

        <Link
          href="/"
          className="inline-block text-sm text-muted-foreground hover:text-black mb-6"
        >
          ← Назад
        </Link>

        <h1 className="text-3xl font-bold mb-8">
          База знаний
        </h1>

        <Card className="mb-8">
          <CardContent className="pt-6">

            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4"
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded p-2"
            >
              <option value="all">Все типы</option>
              <option value="thought">Мысли</option>
              <option value="quote">Цитаты</option>
              <option value="book">Книги</option>
              <option value="music">Музыка</option>
              <option value="idea">Идеи</option>
              <option value="recipe">Рецепты</option>
              <option value="screenshot">Скриншоты</option>
            </select>

          </CardContent>
        </Card>

        <div className="mb-10">

          <h2 className="text-xl font-semibold mb-4">
            Теги
          </h2>

          <div className="flex flex-wrap gap-3">

            {allTags.map((tag: string, index: number) => (

              <Link
                key={`${tag}-${index}`}
                href={`/tags/${encodeURIComponent(tag)}`}
              >
                <Badge variant="secondary">
                  #{tag}
                </Badge>
              </Link>

            ))}

          </div>

        </div>

        <div className="space-y-4">

          {filtered.map((card: any, index: number) => (

            <Link
              key={`${card.id}-${index}`}
              href={`/cards/${card.id}`}
              className="block"
            >

              <Card className="hover:shadow-md transition cursor-pointer">

                <CardHeader>

                  <div className="text-sm text-muted-foreground">
                    {getTypeLabel(card.type)}
                  </div>

                  {card.title && (
                    <CardTitle>
                      {card.title}
                    </CardTitle>
                  )}

                </CardHeader>

                <CardContent>

                  {card.content && (
                    <div className="text-muted-foreground mb-3">
                      {card.content}
                    </div>
                  )}

                  {card.tags && card.tags.length > 0 && (

                    <div className="flex flex-wrap gap-2">

                      {card.tags.map((t: string, tagIndex: number) => (

                        <Badge
                          key={`${card.id}-${t}-${tagIndex}`}
                          variant="secondary"
                        >
                          #{t}
                        </Badge>

                      ))}

                    </div>

                  )}

                </CardContent>

              </Card>

            </Link>

          ))}

        </div>

      </div>

    </main>
  );
}
