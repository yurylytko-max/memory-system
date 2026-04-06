import { describe, expect, test } from "vitest";

import { DELETE, GET, PUT } from "@/app/api/vocabulary/[id]/route";
import { readVocabulary, writeVocabulary } from "@/lib/server/vocabulary-store";

describe("vocabulary by id route", () => {
  test("GET returns a vocabulary card with mnemonic metadata", async () => {
    await writeVocabulary([
      {
        id: "word-1",
        text: "Haus",
        translation: "дом",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
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
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: [],
        mnemonic_status: "in_progress",
        mnemonic_mode: "sound",
        mnemonic: {
          kind: "sound",
          sound_anchor: "хаос",
          image_anchor: "хаос в доме",
        },
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await GET(new Request("http://localhost/api/vocabulary/word-1"), {
      params: Promise.resolve({ id: "word-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.item.mnemonic_mode).toBe("sound");
  });

  test("PUT stores linked-word relation as structured data", async () => {
    await writeVocabulary([
      {
        id: "word-1",
        text: "Haus",
        translation: "дом",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
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
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: [],
        mnemonic_status: "none",
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
      {
        id: "word-2",
        text: "Tür",
        translation: "дверь",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
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
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: [],
        mnemonic_status: "none",
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await PUT(
      new Request("http://localhost/api/vocabulary/word-1", {
        method: "PUT",
        body: JSON.stringify({
          mnemonic_status: "in_progress",
          mnemonic_mode: "linked_word",
          mnemonic: {
            kind: "linked_word",
            target_card_id: "word-2",
            relation: "дом открывается дверью",
          },
        }),
      }),
      {
        params: Promise.resolve({ id: "word-1" }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.item.mnemonic_mode).toBe("linked_word");
    expect(payload.item.mnemonic.target_card_id).toBe("word-2");
  });

  test("PUT rejects invalid chain longer than five elements", async () => {
    await writeVocabulary([
      {
        id: "word-1",
        text: "Liste",
        translation: "список",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
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
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: [],
        mnemonic_status: "none",
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await PUT(
      new Request("http://localhost/api/vocabulary/word-1", {
        method: "PUT",
        body: JSON.stringify({
          mnemonic_status: "anchored",
          mnemonic_mode: "chain",
          mnemonic: {
            kind: "chain",
            elements: Array.from({ length: 6 }, (_, index) => ({
              id: `element-${index}`,
              label: `Элемент ${index + 1}`,
            })),
            links: Array.from({ length: 5 }, (_, index) => ({
              from_id: `element-${index}`,
              to_id: `element-${index + 1}`,
              relation: "связан",
            })),
          },
        }),
      }),
      {
        params: Promise.resolve({ id: "word-1" }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("В цепочке может быть максимум 5 элементов.");
  });

  test("PUT anchors mnemonic only after successful verification", async () => {
    await writeVocabulary([
      {
        id: "word-1",
        text: "Haus",
        translation: "дом",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
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
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: [],
        mnemonic_status: "in_progress",
        mnemonic_mode: "sound",
        mnemonic: {
          kind: "sound",
          sound_anchor: "хаос",
          image_anchor: "хаос в доме",
        },
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await PUT(
      new Request("http://localhost/api/vocabulary/word-1", {
        method: "PUT",
        body: JSON.stringify({
          verify_success: true,
        }),
      }),
      {
        params: Promise.resolve({ id: "word-1" }),
      }
    );

    expect(response.status).toBe(200);

    const [item] = await readVocabulary();
    expect(item.mnemonic_status).toBe("anchored");
    expect(item.mnemonic_verification?.success).toBe(true);
  });

  test("PUT marks anchored mnemonic back to in_progress when user says it did not work", async () => {
    await writeVocabulary([
      {
        id: "word-1",
        text: "Haus",
        translation: "дом",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
        collection: "study-3-dictionary",
        status: "review",
        learning_step: 2,
        repetitions: 2,
        correct: 2,
        wrong: 0,
        correct_count: 2,
        wrong_count: 0,
        interval: 2,
        ease: 2.5,
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: ["good", "good"],
        mnemonic_status: "anchored",
        mnemonic_mode: "sound",
        mnemonic: {
          kind: "sound",
          sound_anchor: "хаос",
          image_anchor: "хаос в доме",
        },
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await PUT(
      new Request("http://localhost/api/vocabulary/word-1", {
        method: "PUT",
        body: JSON.stringify({
          worked_last_time: false,
        }),
      }),
      {
        params: Promise.resolve({ id: "word-1" }),
      }
    );

    expect(response.status).toBe(200);

    const [item] = await readVocabulary();
    expect(item.mnemonic_status).toBe("in_progress");
    expect(item.mnemonic_worked_last_time).toBe(false);
  });

  test("DELETE removes a vocabulary card from storage and queue", async () => {
    await writeVocabulary([
      {
        id: "word-1",
        text: "Haus",
        translation: "дом",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
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
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: [],
        mnemonic_status: "none",
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
      {
        id: "word-2",
        text: "Tür",
        translation: "дверь",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
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
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: ["good", "good"],
        mnemonic_status: "none",
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await DELETE(new Request("http://localhost/api/vocabulary/word-1"), {
      params: Promise.resolve({ id: "word-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, deletedId: "word-1" });

    const items = await readVocabulary();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("word-2");
  });

  test("DELETE with mnemonic scope clears mnemonic state completely", async () => {
    await writeVocabulary([
      {
        id: "word-1",
        text: "Haus",
        translation: "дом",
        source_type: "study-3",
        source_book_id: "study-book-1",
        source_book_title: "Book",
        collection: "study-3-dictionary",
        status: "review",
        learning_step: 2,
        repetitions: 2,
        correct: 2,
        wrong: 0,
        correct_count: 2,
        wrong_count: 0,
        interval: 2,
        ease: 2.5,
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: ["good", "good"],
        mnemonic_status: "anchored",
        mnemonic_mode: "sound",
        mnemonic: {
          kind: "sound",
          sound_anchor: "хаос",
          image_anchor: "хаос в доме",
        },
        mnemonic_verification: {
          direction: "cue_to_word",
          prompt: "хаос в доме",
          answer: "Haus",
          success: true,
          checked_at: "2026-04-05T12:10:00.000Z",
        },
        mnemonic_worked_last_time: true,
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await DELETE(
      new Request("http://localhost/api/vocabulary/word-1?scope=mnemonic"),
      {
        params: Promise.resolve({ id: "word-1" }),
      }
    );

    expect(response.status).toBe(200);

    const [item] = await readVocabulary();
    expect(item.mnemonic_status).toBe("none");
    expect(item.mnemonic_mode).toBeUndefined();
    expect(item.mnemonic).toBeUndefined();
    expect(item.mnemonic_verification).toBeUndefined();
    expect(item.mnemonic_worked_last_time).toBeUndefined();
  });
});
