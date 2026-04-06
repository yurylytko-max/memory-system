import { describe, expect, test } from "vitest";

import {
  applyVocabularyMnemonicUpdate,
  applyVocabularyReview,
  buildVocabularyReviewQueue,
  getVocabularyMnemonicRecommendation,
  normalizeVocabulary,
  removeVocabularyItemAndCleanup,
  validateVocabularyMnemonic,
} from "@/lib/vocabulary";

describe("vocabulary domain", () => {
  test("keeps study-3 items in a dedicated dictionary collection", () => {
    const [item] = normalizeVocabulary([
      {
        text: "Haus",
        translation: "дом",
      },
    ]);

    expect(item.source_type).toBe("study-3");
    expect(item.collection).toBe("study-3-dictionary");
    expect(item.status).toBe("new");
  });

  test("defaults mnemonic state to none", () => {
    const [item] = normalizeVocabulary([
      {
        text: "Baum",
        translation: "дерево",
      },
    ]);

    expect(item.mnemonic_status).toBe("none");
    expect(item.mnemonic).toBeUndefined();
  });

  test("serves new study words sequentially before due reviews", () => {
    const items = normalizeVocabulary([
      {
        id: "new-2",
        text: "zwei",
        translation: "два",
        created_at: "2026-04-05T12:05:00.000Z",
        next_review: "2026-04-05T12:05:00.000Z",
      },
      {
        id: "review-1",
        text: "eins",
        translation: "один",
        status: "review",
        repetitions: 2,
        recent_ratings: ["good"],
        created_at: "2026-04-01T12:00:00.000Z",
        next_review: "2026-04-04T12:00:00.000Z",
      },
      {
        id: "new-1",
        text: "null",
        translation: "ноль",
        created_at: "2026-04-05T12:00:00.000Z",
        next_review: "2026-04-05T12:00:00.000Z",
      },
    ]);

    const queue = buildVocabularyReviewQueue(items, new Date("2026-04-06T12:00:00.000Z"));

    expect(queue.queue.map((item) => item.id)).toEqual(["new-1", "new-2", "review-1"]);
  });

  test("moves a new word into spaced repetition after a successful first review", () => {
    const [item] = normalizeVocabulary([
      {
        id: "new-1",
        text: "lernen",
        translation: "учить",
      },
    ]);

    const updated = applyVocabularyReview(item, "good", new Date("2026-04-06T09:00:00.000Z"));

    expect(updated.status).toBe("review");
    expect(updated.repetitions).toBe(1);
    expect(updated.interval).toBe(1);
    expect(updated.next_review).toBe("2026-04-07T09:00:00.000Z");
  });

  test("preserves structured sound mnemonic", () => {
    const [item] = normalizeVocabulary([
      {
        text: "Haus",
        translation: "дом",
      },
    ]);

    const updated = applyVocabularyMnemonicUpdate(item, {
      mnemonic_status: "in_progress",
      mnemonic_mode: "sound",
      mnemonic: {
        kind: "sound",
        sound_anchor: "хаос",
        image_anchor: "хаос в доме",
      },
    });

    expect(updated.mnemonic_status).toBe("in_progress");
    expect(updated.mnemonic_mode).toBe("sound");
    expect(updated.mnemonic).toEqual({
      kind: "sound",
      sound_anchor: "хаос",
      image_anchor: "хаос в доме",
    });
  });

  test("rejects chain longer than five elements", () => {
    const [item] = normalizeVocabulary([
      {
        text: "Ordnung",
        translation: "порядок",
      },
    ]);
    const updated = applyVocabularyMnemonicUpdate(item, {
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
    });

    expect(validateVocabularyMnemonic(updated, [updated])).toBe(
      "В цепочке может быть максимум 5 элементов."
    );
  });

  test("rejects nested mnemonic deeper than three levels", () => {
    const [item] = normalizeVocabulary([
      {
        text: "Schrank",
        translation: "шкаф",
      },
    ]);
    const updated = applyVocabularyMnemonicUpdate(item, {
      mnemonic_status: "anchored",
      mnemonic_mode: "nested",
      mnemonic: {
        kind: "nested",
        base: {
          id: "base",
          label: "шкаф",
          children: [
            {
              id: "child-1",
              label: "полка",
              placement: "на полке",
              children: [
                {
                  id: "child-2",
                  label: "ящик",
                  placement: "внутри",
                  children: [
                    {
                      id: "child-3",
                      label: "ключ",
                      placement: "под",
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    expect(validateVocabularyMnemonic(updated, [updated])).toBe(
      "Во вложении может быть максимум 3 уровня."
    );
  });

  test("manual recommendation is explicit and review recommendation appears on unstable answers", () => {
    const [item] = normalizeVocabulary([
      {
        text: "Weg",
        translation: "путь",
        recent_ratings: ["good", "again", "hard"],
      },
    ]);

    expect(getVocabularyMnemonicRecommendation(item, "manual")).toEqual({
      recommended: true,
      reason: "manual",
    });
    expect(getVocabularyMnemonicRecommendation(item, "review", "hard")).toEqual({
      recommended: true,
      reason: "unstable",
    });
  });

  test("review flow keeps mnemonic data intact", () => {
    const [item] = normalizeVocabulary([
      {
        text: "Tür",
        translation: "дверь",
        status: "review",
        repetitions: 2,
        interval: 2,
        recent_ratings: ["good", "good"],
        mnemonic_status: "anchored",
        mnemonic_mode: "sound",
        mnemonic: {
          kind: "sound",
          sound_anchor: "тур",
          image_anchor: "тур открывает дверь",
        },
      },
    ]);

    const updated = applyVocabularyReview(item, "good", new Date("2026-04-06T12:00:00.000Z"));

    expect(updated.mnemonic_status).toBe("anchored");
    expect(updated.mnemonic_mode).toBe("sound");
    expect(updated.mnemonic).toEqual(item.mnemonic);
  });

  test("removing a vocabulary card cleans up linked mnemonic references", () => {
    const items = normalizeVocabulary([
      {
        id: "word-1",
        text: "Haus",
        translation: "дом",
        mnemonic_status: "anchored",
        mnemonic_mode: "linked_word",
        mnemonic: {
          kind: "linked_word",
          target_card_id: "word-2",
          relation: "дом открывается дверью",
        },
      },
      {
        id: "word-2",
        text: "Tür",
        translation: "дверь",
      },
    ]);

    const cleaned = removeVocabularyItemAndCleanup(items, "word-2");

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe("word-1");
    expect(cleaned[0].mnemonic_status).toBe("none");
    expect(cleaned[0].mnemonic).toBeUndefined();
  });
});
