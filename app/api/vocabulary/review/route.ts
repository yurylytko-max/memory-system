import { NextResponse } from "next/server";

import { readVocabulary, writeVocabulary } from "@/lib/server/vocabulary-store";

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string; correct?: boolean };
  const id = body.id?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Не передан id карточки." }, { status: 400 });
  }

  const items = await readVocabulary();
  const now = new Date();
  const updated = items.map((item) => {
    if (item.id !== id) {
      return item;
    }

    const correct = Boolean(body.correct);
    const interval = correct ? Math.max(1, item.interval * 2) : 1;
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      ...item,
      interval,
      ease: correct ? Math.min(3, item.ease + 0.1) : Math.max(1.3, item.ease - 0.2),
      correct: correct ? item.correct + 1 : item.correct,
      wrong: correct ? item.wrong : item.wrong + 1,
      correct_count: correct ? item.correct_count + 1 : item.correct_count,
      wrong_count: correct ? item.wrong_count : item.wrong_count + 1,
      next_review: nextReview.toISOString(),
      updated_at: now.toISOString(),
    };
  });

  await writeVocabulary(updated);

  return NextResponse.json({ success: true, items: updated });
}
