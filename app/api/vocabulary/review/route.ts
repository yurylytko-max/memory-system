import { NextResponse } from "next/server";

import {
  applyVocabularyReview,
  buildVocabularyReviewQueue,
  getVocabularyMnemonicRecommendation,
  isVocabularyReviewRating,
} from "@/lib/vocabulary";
import { readVocabulary, writeVocabulary } from "@/lib/server/vocabulary-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const items = await readVocabulary();
  const queue = buildVocabularyReviewQueue(
    source === "study-3" ? items.filter((item) => item.source_type === "study-3") : items
  );

  return NextResponse.json(queue);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    correct?: boolean;
    rating?: string;
  };
  const id = body.id?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Не передан id карточки." }, { status: 400 });
  }

  const rating = isVocabularyReviewRating(body.rating)
    ? body.rating
    : body.correct === false
      ? "again"
      : "good";
  const items = await readVocabulary();
  const now = new Date();
  let found = false;
  let reviewedItem = null;
  const updated = items.map((item) => {
    if (item.id !== id) {
      return item;
    }

    found = true;
    reviewedItem = applyVocabularyReview(item, rating, now);
    return reviewedItem;
  });

  if (!found) {
    return NextResponse.json({ error: "Карточка словаря не найдена." }, { status: 404 });
  }

  await writeVocabulary(updated);

  const recommendation = reviewedItem
    ? getVocabularyMnemonicRecommendation(reviewedItem, "review", rating)
    : { recommended: false, reason: null };

  return NextResponse.json({
    success: true,
    items: updated,
    reviewedItem,
    recommendation,
    queue: buildVocabularyReviewQueue(updated, now),
  });
}
