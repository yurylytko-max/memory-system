import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCardWorkspaceLabel,
  getCardContentPreview,
  isCardWorkspace,
  normalizeCard,
} from "@/lib/cards";
import { readCards } from "@/lib/server/cards-store";

type TagPageProps = {
  params: Promise<{
    tag: string;
  }>;
  searchParams: Promise<{
    workspace?: string;
  }>;
};

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

function decodeTagParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tag: rawTag } = await params;
  const resolvedSearchParams = await searchParams;
  const tag = decodeTagParam(rawTag);
  const workspace = isCardWorkspace(resolvedSearchParams.workspace)
    ? resolvedSearchParams.workspace
    : "life";
  const cards = await readCards();

  const taggedCards = cards
    .map((card, index) => normalizeCard(card, index))
    .filter((card) => card.workspace === workspace && card.tags.includes(tag));

  return (
    <main className="min-h-screen bg-muted/40 p-10">
      <div className="max-w-5xl mx-auto">
        <Link
          href={`/cards/space/${workspace}`}
          className="inline-block text-sm text-muted-foreground hover:text-black mb-6"
        >
          ← Назад к карточкам
        </Link>

        <div className="mb-8">
          <div className="text-sm text-muted-foreground mb-2">Тег</div>
          <h1 className="text-3xl font-bold">#{tag}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Пространство: {getCardWorkspaceLabel(workspace)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Найдено карточек: {taggedCards.length}
          </p>
        </div>

        {taggedCards.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">
              Для этого тега карточек пока нет.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {taggedCards.map((card, index) => (
              <Link
                key={`${card.id}-${index}`}
                href={`/cards/${card.id}?workspace=${workspace}`}
                className="block"
              >
                <Card className="hover:shadow-md transition cursor-pointer">
                  <CardHeader>
                    <div className="text-sm text-muted-foreground">
                      {getTypeLabel(card.type)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Сфера: {card.sphere}
                    </div>

                    {card.title && <CardTitle>{card.title}</CardTitle>}
                  </CardHeader>

                  <CardContent>
                    {getCardContentPreview(card) && (
                      <div className="text-muted-foreground mb-3">
                        {getCardContentPreview(card)}
                      </div>
                    )}

                    {card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {card.tags.map((itemTag, tagIndex) => (
                          <Badge
                            key={`${card.id}-${itemTag}-${tagIndex}`}
                            variant={itemTag === tag ? "default" : "secondary"}
                          >
                            #{itemTag}
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
      </div>
    </main>
  );
}
