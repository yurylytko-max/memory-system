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
          {
            id: "study-card",
            title: "Study",
            content: "Checklist",
            contentType: "checklist",
            checklist: [
              {
                id: "study-item",
                text: "Read",
                checked: false,
              },
            ],
            source: "",
            type: "thought",
            sphere: "Study",
            tags: [],
            image: null,
            workspace: "study",
          },
        ]),
      })
    );

    const response = await GET(new Request("http://localhost/api/cards?workspace=study"));
    const cards = await response.json();

    expect(cards).toHaveLength(1);
    expect(cards[0].workspace).toBe("study");
    expect(cards[0].checklist[0].text).toBe("Read");
  });
});
