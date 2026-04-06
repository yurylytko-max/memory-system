"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAllCards,
  getCardWorkspaceLabel,
  isCardWorkspace,
  normalizeCard,
  type Card as MemoryCard,
  type CardWorkspace,
} from "@/lib/cards";

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

export default function CardsWorkspacePage({
}: Record<string, never>) {
  const params = useParams();
  const [workspace, setWorkspace] = useState<CardWorkspace | null>(null);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function resolveParamsAndLoad() {
      const rawWorkspace = Array.isArray(params.workspace)
        ? params.workspace[0]
        : params.workspace;

      if (!isCardWorkspace(rawWorkspace)) {
        setWorkspace(null);
        setResolved(true);
        return;
      }

      setWorkspace(rawWorkspace);

      try {
        const data = await getAllCards(rawWorkspace);
        setCards(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить карточки."
        );
      }
      setResolved(true);
    }

    void resolveParamsAndLoad();
  }, [params.workspace]);

  const normalizedCards = useMemo(() => {
    return cards.map((card, index) => normalizeCard(card, index));
  }, [cards]);

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

  if (!resolved) {
    return null;
  }

  if (!workspace) {
    return (
      <main className="min-h-screen bg-muted/40 p-10" data-testid="cards-workspace-missing">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/cards"
            className="mb-6 inline-block text-sm text-muted-foreground hover:text-black"
          >
            ← Назад
          </Link>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            Пространство базы знаний не найдено.
          </div>
        </div>
      </main>
    );
  }

  const workspaceLabel = getCardWorkspaceLabel(workspace);

  return (
    <main
      className="min-h-screen bg-muted/40 p-10"
      data-testid="cards-workspace-page"
      data-workspace={workspace}
    >
      <div className="mx-auto max-w-6xl">
        <Link
          href="/cards"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-black"
        >
          ← Назад к выбору пространства
        </Link>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Пространство
            </div>
            <h1 className="mb-2 text-3xl font-bold">База знаний: {workspaceLabel}</h1>
            <p className="text-sm text-muted-foreground">
              Здесь отображаются только карточки пространства «{workspaceLabel}».
            </p>
          </div>

          <Link
            href={`/cards/new?workspace=${workspace}`}
            data-testid="new-card-link"
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            Новая карточка
          </Link>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <input
              data-testid="cards-search-input"
              placeholder="Поиск по карточкам, сферам и тегам..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mb-4 w-full rounded border px-3 py-2"
            />

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <select
                data-testid="cards-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded border bg-background p-2 text-foreground"
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

        {error ? (
          <Card data-testid="cards-error-state">
            <CardContent className="pt-6 text-red-600">{error}</CardContent>
          </Card>
        ) : null}

        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">Сферы</h2>
            <p className="text-sm text-muted-foreground">
              Открой папку, чтобы увидеть карточки только этого пространства.
            </p>
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
                  href={`/cards/spheres/${encodeSphereParam(folder.sphere)}?workspace=${workspace}`}
                  data-testid={`sphere-folder-${folder.sphere}`}
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
              Только свежие карточки пространства «{workspaceLabel}».
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
                  href={`/cards/${card.id}?workspace=${workspace}`}
                  data-testid={`card-link-${card.id}`}
                  className="block"
                >
                  <Card className="cursor-pointer transition hover:shadow-md">
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
                        <p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">
                          {card.content}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
