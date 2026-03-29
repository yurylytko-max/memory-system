import { NextResponse } from "next/server";

import { normalizeVocabularyItem } from "@/lib/vocabulary";
import { readVocabulary, writeVocabulary } from "@/lib/server/vocabulary-store";

function sortByReview(items: Awaited<ReturnType<typeof readVocabulary>>) {
  return [...items].sort((left, right) => left.next_review.localeCompare(right.next_review));
}

export async function GET() {
  const items = sortByReview(await readVocabulary());
  const now = new Date().toISOString();
  const due = items.filter((item) => item.next_review <= now);

  return NextResponse.json({
    items,
    due,
    now,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as
    | {
        items?: Array<{
          text?: string;
          translation?: string;
          context?: string;
          source_lesson?: string;
          source_page?: number;
        }>;
      }
    | {
        text?: string;
        translation?: string;
        context?: string;
        source_lesson?: string;
        source_page?: number;
      };
  const incomingItems = Array.isArray((body as { items?: unknown[] }).items)
    ? (
        body as {
          items: Array<{
            text?: string;
            translation?: string;
            context?: string;
            source_lesson?: string;
            source_page?: number;
          }>;
        }
      ).items
    : [
        body as {
          text?: string;
          translation?: string;
          context?: string;
          source_lesson?: string;
          source_page?: number;
        },
      ];
  const existing = await readVocabulary();
  const nextItems = [...existing];
  const existingKeys = new Set(
    existing.map(
      (item) =>
        `${item.text.trim().toLocaleLowerCase("de-DE")}::${item.translation
          .trim()
          .toLocaleLowerCase("ru-RU")}`
    )
  );

  incomingItems.forEach((item, index) => {
    const normalized = normalizeVocabularyItem(item, existing.length + index);
    const key = `${normalized.text.trim().toLocaleLowerCase("de-DE")}::${normalized.translation
      .trim()
      .toLocaleLowerCase("ru-RU")}`;

    if (!key || existingKeys.has(key)) {
      return;
    }

    existingKeys.add(key);
    nextItems.push(normalized);
  });

  await writeVocabulary(nextItems);

  return NextResponse.json({
    success: true,
    items: sortByReview(nextItems),
  });
}
