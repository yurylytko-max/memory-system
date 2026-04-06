import { describe, expect, test } from "vitest";

import { readCards } from "@/lib/server/cards-store";
import { GET, POST, PUT } from "@/app/api/cards/route";

describe("cards route", () => {
  test("POST normalizes legacy payload into life workspace", async () => {
    const response = await POST(
      new Request("http://localhost/api/cards", {
        method: "POST",
        body: JSON.stringify({
          id: "card-legacy",
          title: "Legacy",
          content: "Text",
          type: "thought",
          sphere: "Archive",
          tags: [],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect((await readCards())[0].workspace).toBe("life");
  });

  test("GET filters cards by workspace", async () => {
    await PUT(
      new Request("http://localhost/api/cards", {
        method: "PUT",
        body: JSON.stringify([
          {
            id: "life-card",
            title: "Life",
            content: "Text",
            source: "",
            type: "thought",
            sphere: "Life",
            tags: [],
            image: null,
            workspace: "life",
          },
          {
            id: "work-card",
            title: "Work",
            content: "Text",
            source: "",
            type: "article",
            sphere: "Work",
            tags: [],
            image: null,
            workspace: "work",
          },
        ]),
      })
    );

    const response = await GET(new Request("http://localhost/api/cards?workspace=work"));
    const cards = await response.json();

    expect(cards).toHaveLength(1);
    expect(cards[0].workspace).toBe("work");
  });
});
