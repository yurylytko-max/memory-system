"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeCard } from "@/lib/cards";

function getTypeLabel(type: string) {
  switch (type) {
    case "thought":
      return "Мысль";
    case "article":
      return "Статья";
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
      new Set(normalizedCards.flatMap((card) => card.tags || []))
    ).sort((left, right) => left.localeCompare(right, "ru"));
  }, [normalizedCards]);

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return normalizedCards.filter((card) => {
      const text = [
        card.title,
        card.content,
        card.source,
        card.sphere,
        ...card.tags,
      ]
        .join(" ")
        .toLowerCase();
      const searchMatch =
        normalizedSearch.length === 0 || text.includes(normalizedSearch);
      const typeMatch = typeFilter === "all" || card.type === typeFilter;

      return searchMatch && typeMatch;
    });
  }, [normalizedCards, search, typeFilter]);

  const groupedCards = useMemo(() => {
    const groups = new Map<string, typeof filteredCards>();

    for (const card of filteredCards) {
      const current = groups.get(card.sphere) ?? [];
      current.push(card);
      groups.set(card.sphere, current);
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right, "ru"))
      .map(([sphere, sphereCards]) => ({
        sphere,
        cards: sphereCards.sort((left, right) =>
          left.title.localeCompare(right.title, "ru")
        ),
      }));
  }, [filteredCards]);

  return (
    <main className="min-h-screen bg-muted/40 p-10">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-block text-sm text-muted-foreground hover:text-black mb-6"
        >
          ← Назад
        </Link>

        <h1 className="text-3xl font-bold mb-2">База знаний</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Карточки сгруппированы по сферам, теги работают как дополнительная
          навигация.
        </p>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <Input
              placeholder="Поиск по названию, содержанию, сфере и тегам..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4"
            />

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded p-2 bg-background text-foreground"
              >
                <option value="all">Все типы</option>
                <option value="thought">Мысли</option>
                <option value="article">Статьи</option>
                <option value="quote">Цитаты</option>
                <option value="book">Книги</option>
                <option value="music">Музыка</option>
                <option value="idea">Идеи</option>
                <option value="recipe">Рецепты</option>
                <option value="screenshot">Скриншоты</option>
              </select>

              <span>Сфер: {groupedCards.length}</span>
              <span>Карточек: {filteredCards.length}</span>
            </div>
          </CardContent>
        </Card>

        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Теги</h2>

          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Тегов пока нет.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {allTags.map((tag, index) => (
                <Link
                  key={`${tag}-${index}`}
                  href={`/tags/${encodeURIComponent(tag)}`}
                >
                  <Badge variant="secondary">#{tag}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {groupedCards.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">
              Ничего не найдено по текущим фильтрам.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedCards.map(({ sphere, cards: sphereCards }) => (
              <section key={sphere} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">{sphere}</h2>
                    <p className="text-sm text-muted-foreground">
                      Карточек в сфере: {sphereCards.length}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {sphereCards.map((card, index) => (
                    <Link
                      key={`${card.id}-${index}`}
                      href={`/cards/${card.id}`}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition cursor-pointer">
                        <CardHeader>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{getTypeLabel(card.type)}</span>
                            <span>•</span>
                            <span>{card.sphere}</span>
                          </div>

                          {card.title && <CardTitle>{card.title}</CardTitle>}
                        </CardHeader>

                        <CardContent>
                          {card.content && (
                            <div className="text-muted-foreground mb-3 whitespace-pre-wrap">
                              {card.content}
                            </div>
                          )}

                          {card.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {card.tags.map((tag, tagIndex) => (
                                <Badge
                                  key={`${card.id}-${tag}-${tagIndex}`}
                                  variant="secondary"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
