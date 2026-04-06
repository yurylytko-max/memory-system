import { describe, expect, test } from "vitest";

import { normalizeCard, normalizeCards } from "@/lib/cards";

describe("cards normalization", () => {
  test("legacy cards default to life workspace", () => {
    const card = normalizeCard({
      id: "legacy-card",
      title: "Legacy",
      content: "Text",
      type: "thought",
      sphere: "Archive",
      tags: [],
    });

    expect(card.workspace).toBe("life");
  });

  test("normalizeCards preserves explicit work workspace", () => {
    const [card] = normalizeCards([
      {
        id: "work-card",
        title: "Work",
        content: "Text",
        type: "article",
        sphere: "Engineering",
        tags: ["tag"],
        workspace: "work",
      },
    ]);

    expect(card.workspace).toBe("work");
    expect(card.type).toBe("article");
  });
});
