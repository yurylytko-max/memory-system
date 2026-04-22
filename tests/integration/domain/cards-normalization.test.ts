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

  test("normalizeCard accepts study workspace and checklist content", () => {
    const card = normalizeCard({
      id: "study-card",
      title: "Study",
      content: "",
      contentType: "checklist",
      checklist: [
        { id: "item-1", text: "Read chapter", checked: true },
        { id: "item-2", text: "  ", checked: false },
      ],
      type: "thought",
      sphere: "German",
      tags: ["study"],
      workspace: "study",
    });

    expect(card.workspace).toBe("study");
    expect(card.contentType).toBe("checklist");
    expect(card.checklist).toEqual([
      { id: "item-1", text: "Read chapter", checked: true },
    ]);
  });
});
