import { describe, expect, test } from "vitest";

import { readCards, writeCards } from "@/lib/server/cards-store";

describe("cards store", () => {
  test("reads and writes cards through file fallback", async () => {
    await writeCards([
      {
        id: "card-1",
        title: "Card",
        content: "Content",
        source: "",
        type: "thought",
        sphere: "Life",
        tags: [],
        image: null,
        workspace: "life",
      },
    ]);

    const cards = await readCards();

    expect(cards).toHaveLength(1);
    expect(cards[0].workspace).toBe("life");
  });
});
