import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCardWorkspaceLabel,
  isCardWorkspace,
  normalizeCard,
} from "@/lib/cards";
import { readCards } from "@/lib/server/cards-store";

type SpherePageProps = {
  params: Promise<{
    sphere: string;
  }>;
  searchParams: Promise<{
    workspace?: string;
  }>;
};

function decodeSphereParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

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

export default async function SpherePage({ params, searchParams }: SpherePageProps) {
  const { sphere: rawSphere } = await params;
  const resolvedSearchParams = await searchParams;
  const sphere = decodeSphereParam(rawSphere);
  const workspace = isCardWorkspace(resolvedSearchParams.workspace)
    ? resolvedSearchParams.workspace
    : "life";
  const cards = (await readCards())
    .map((card, index) => normalizeCard(card, index))
    .filter((card) => card.sphere === sphere && card.workspace === workspace)
    .reverse();

  return (
    <main className="min-h-screen bg-muted/40 p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/cards/space/${workspace}`}
          className="inline-block text-sm text-muted-foreground hover:text-black mb-6"
        >
          ← Назад к сферам
        </Link>

        <div className="mb-8">
          <div className="text-sm text-muted-foreground mb-2">Сфера</div>
          <h1 className="text-3xl font-bold">{sphere}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Пространство: {getCardWorkspaceLabel(workspace)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Карточек в папке: {cards.length}
          </p>
        </div>

        {cards.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">
              В этой сфере карточек пока нет.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cards.map((card, index) => (
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
        )}
      </div>
    </main>
  );
}
