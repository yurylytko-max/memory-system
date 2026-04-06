import { describe, expect, test } from "vitest";

import { GET, POST } from "@/app/api/vocabulary/review/route";
import { writeVocabulary } from "@/lib/server/vocabulary-store";

describe("vocabulary review route", () => {
  test("GET exposes queue with new words before review cards", async () => {
    await writeVocabulary([
      {
        id: "review-1",
        text: "alt",
        translation: "старый",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
        source_page: 2,
        collection: "study-3-dictionary",
        status: "review",
        learning_step: 2,
        repetitions: 2,
        correct: 2,
        wrong: 0,
        correct_count: 2,
        wrong_count: 0,
        interval: 1,
        ease: 2.5,
        recent_ratings: ["good", "good"],
        next_review: "2026-04-04T12:00:00.000Z",
        created_at: "2026-04-01T12:00:00.000Z",
        updated_at: "2026-04-04T12:00:00.000Z",
      },
      {
        id: "new-1",
        text: "jung",
        translation: "молодой",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
        source_page: 1,
        collection: "study-3-dictionary",
        status: "new",
        learning_step: 0,
        repetitions: 0,
        correct: 0,
        wrong: 0,
        correct_count: 0,
        wrong_count: 0,
        interval: 1,
        ease: 2.5,
        recent_ratings: [],
        next_review: "2026-04-05T12:00:00.000Z",
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await GET(new Request("http://localhost/api/vocabulary/review?source=study-3"));
    const payload = await response.json();

    expect(payload.queue.map((item: { id: string }) => item.id)).toEqual(["new-1", "review-1"]);
  });

  test("POST promotes a new word to review after a good answer", async () => {
    await writeVocabulary([
      {
        id: "new-1",
        text: "lernen",
        translation: "учить",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
        source_page: 1,
        collection: "study-3-dictionary",
        status: "new",
        learning_step: 0,
        repetitions: 0,
        correct: 0,
        wrong: 0,
        correct_count: 0,
        wrong_count: 0,
        interval: 1,
        ease: 2.5,
        recent_ratings: [],
        mnemonic_status: "none",
        next_review: "2026-04-05T12:00:00.000Z",
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/vocabulary/review", {
        method: "POST",
        body: JSON.stringify({
          id: "new-1",
          rating: "good",
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.reviewedItem.status).toBe("review");
    expect(payload.reviewedItem.repetitions).toBe(1);
    expect(payload.queue.queue).toHaveLength(0);
  });

  test("POST recommends mnemonic after an error", async () => {
    await writeVocabulary([
      {
        id: "weak-1",
        text: "merken",
        translation: "запоминать",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
        source_page: 3,
        collection: "study-3-dictionary",
        status: "review",
        learning_step: 2,
        repetitions: 2,
        correct: 1,
        wrong: 1,
        correct_count: 1,
        wrong_count: 1,
        interval: 1,
        ease: 2.3,
        recent_ratings: ["good", "good"],
        mnemonic_status: "none",
        next_review: "2026-04-04T12:00:00.000Z",
        created_at: "2026-04-04T12:00:00.000Z",
        updated_at: "2026-04-04T12:00:00.000Z",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/vocabulary/review", {
        method: "POST",
        body: JSON.stringify({
          id: "weak-1",
          rating: "again",
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.recommendation).toEqual({
      recommended: true,
      reason: "error",
    });
  });

  test("POST recommends mnemonic on unstable answers without breaking anchored mnemonic", async () => {
    await writeVocabulary([
      {
        id: "weak-2",
        text: "sehen",
        translation: "видеть",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
        source_page: 1,
        collection: "study-3-dictionary",
        status: "review",
        learning_step: 2,
        repetitions: 3,
        correct: 3,
        wrong: 1,
        correct_count: 3,
        wrong_count: 1,
        interval: 2,
        ease: 2.4,
        recent_ratings: ["good", "again", "good"],
        mnemonic_status: "anchored",
        mnemonic_mode: "sound",
        mnemonic: {
          kind: "sound",
          sound_anchor: "зеен",
          image_anchor: "сцена зрения",
        },
        next_review: "2026-04-04T12:00:00.000Z",
        created_at: "2026-04-04T12:00:00.000Z",
        updated_at: "2026-04-04T12:00:00.000Z",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/vocabulary/review", {
        method: "POST",
        body: JSON.stringify({
          id: "weak-2",
          rating: "hard",
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.recommendation).toEqual({
      recommended: false,
      reason: "unstable",
    });
    expect(payload.reviewedItem.mnemonic_status).toBe("anchored");
    expect(payload.reviewedItem.mnemonic.sound_anchor).toBe("зеен");
  });
});
