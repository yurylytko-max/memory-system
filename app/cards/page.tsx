"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeCard, type Card as MemoryCard } from "@/lib/cards";

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

function encodeSphereParam(sphere: string) {
  return encodeURIComponent(sphere);
}

export default function CardsPage() {
  const [cards, setCards] = useState<MemoryCard[]>([]);
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

  const sphereFolders = useMemo(() => {
    const groups = new Map<
      string,
      {
        count: number;
        previewTags: string[];
      }
    >();

    for (const card of filteredCards) {
      const current = groups.get(card.sphere) ?? { count: 0, previewTags: [] };
      const mergedTags = Array.from(
        new Set([...current.previewTags, ...card.tags])
      ).slice(0, 3);

      groups.set(card.sphere, {
        count: current.count + 1,
        previewTags: mergedTags,
      });
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right, "ru"))
      .map(([sphere, meta]) => ({
        sphere,
        count: meta.count,
        previewTags: meta.previewTags,
      }));
  }, [filteredCards]);

  const recentCards = useMemo(() => {
    return [...filteredCards].slice(-6).reverse();
  }, [filteredCards]);

  return (
    <main className="min-h-screen bg-muted/40 p-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-block text-sm text-muted-foreground hover:text-black mb-6"
        >
          ← Назад
        </Link>

        <h1 className="text-3xl font-bold mb-2">База знаний</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Сферы работают как папки. На главной показаны сами папки и последние
          карточки.
        </p>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <Input
              placeholder="Поиск по карточкам, сферам и тегам..."
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

              <span>Сфер: {sphereFolders.length}</span>
              <span>Найдено карточек: {filteredCards.length}</span>
            </div>
          </CardContent>
        </Card>

        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Сферы</h2>
              <p className="text-sm text-muted-foreground">
                Открой папку, чтобы увидеть все карточки внутри.
              </p>
            </div>
          </div>

          {sphereFolders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-muted-foreground">
                По текущим фильтрам подходящих сфер нет.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sphereFolders.map((folder) => (
                <Link
                  key={folder.sphere}
                  href={`/cards/spheres/${encodeSphereParam(folder.sphere)}`}
                  className="block"
                >
                  <Card className="min-h-[200px] border bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                    <CardHeader className="gap-3">
                      <div className="text-4xl leading-none">□</div>
                      <CardTitle className="text-lg">{folder.sphere}</CardTitle>
                      <CardDescription>
                        Карточек в папке: {folder.count}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="mt-auto">
                      {folder.previewTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {folder.previewTags.map((tag) => (
                            <Badge key={`${folder.sphere}-${tag}`} variant="secondary">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          В этой сфере пока нет тегов.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">Последнее</h2>
            <p className="text-sm text-muted-foreground">
              На главной остаются только свежие карточки, без полной ленты.
            </p>
          </div>

          {recentCards.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-muted-foreground">
                По текущим фильтрам свежих карточек нет.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {recentCards.map((card, index) => (
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
                        <div className="text-muted-foreground mb-3 line-clamp-4 whitespace-pre-wrap">
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
          )}
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Теги</h2>
          </div>

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
        </section>
      </div>
    </main>
  );
}
