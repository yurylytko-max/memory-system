import { describe, expect, test } from "vitest";

import { GET, POST } from "@/app/api/vocabulary/route";
import { readVocabulary, writeVocabulary } from "@/lib/server/vocabulary-store";

describe("vocabulary route", () => {
  test("POST stores study-3 words in dedicated vocabulary storage with mnemonic defaults", async () => {
    const response = await POST(
      new Request("http://localhost/api/vocabulary", {
        method: "POST",
        body: JSON.stringify({
          text: "Wort",
          translation: "слово",
          source_type: "study-3",
          source_book_id: "study-book-1",
          source_book_title: "Test German Book",
          source_page: 1,
          collection: "study-3-dictionary",
        }),
      })
    );

    expect(response.status).toBe(200);

    const items = await readVocabulary();
    expect(items).toHaveLength(1);
    expect(items[0].source_type).toBe("study-3");
    expect(items[0].collection).toBe("study-3-dictionary");
    expect(items[0].mnemonic_status).toBe("none");
  });

  test("POST stores structured sound mnemonic payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/vocabulary", {
        method: "POST",
        body: JSON.stringify({
          text: "Haus",
          translation: "дом",
          source_type: "study-3",
          source_book_id: "study-book-1",
          source_book_title: "Book",
          source_page: 1,
          collection: "study-3-dictionary",
          mnemonic_status: "in_progress",
          mnemonic_mode: "sound",
          mnemonic: {
            kind: "sound",
            sound_anchor: "хаос",
            image_anchor: "хаос в доме",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    const [item] = await readVocabulary();

    expect(item.mnemonic_status).toBe("in_progress");
    expect(item.mnemonic_mode).toBe("sound");
    expect(item.mnemonic).toEqual({
      kind: "sound",
      sound_anchor: "хаос",
      image_anchor: "хаос в доме",
    });
  });

  test("GET returns review queue and mnemonic metadata for study-3 vocabulary", async () => {
    await writeVocabulary([
      {
        id: "new-1",
        text: "neu",
        translation: "новый",
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
        next_review: "2026-04-05T12:00:00.000Z",
        recent_ratings: [],
        mnemonic_status: "anchored",
        mnemonic_mode: "image",
        mnemonic: {
          kind: "image",
          action: "прыгает",
          interaction: "в лужу",
        },
        created_at: "2026-04-05T12:00:00.000Z",
        updated_at: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const response = await GET(new Request("http://localhost/api/vocabulary?source=study-3"));
    const payload = await response.json();

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].mnemonic_status).toBe("anchored");
    expect(payload.queue.queue).toHaveLength(1);
    expect(payload.queue.queue[0].id).toBe("new-1");
  });
});
