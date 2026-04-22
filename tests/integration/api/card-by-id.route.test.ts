import { afterEach, describe, expect, test, vi } from "vitest";

import { writeCards } from "@/lib/server/cards-store";
import {
  DELETE,
  GET,
  PUT,
} from "@/app/api/cards/[id]/route";

describe("card by id route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  test("GET respects workspace context", async () => {
    await writeCards([
      {
        id: "card-1",
        title: "Card",
        content: "Text",
        source: "",
        type: "thought",
        sphere: "Life",
        tags: [],
        image: null,
        workspace: "life",
      },
    ]);

    const response = await GET(new Request("http://localhost/api/cards/card-1?workspace=work"), {
      params: Promise.resolve({ id: "card-1" }),
    });

    expect(response.status).toBe(404);
  });

  test("PUT updates a card", async () => {
    await writeCards([
      {
        id: "card-1",
        title: "Card",
        content: "Text",
        source: "",
        type: "thought",
        sphere: "Life",
        tags: [],
        image: null,
        workspace: "life",
      },
    ]);

    const response = await PUT(
      new Request("http://localhost/api/cards/card-1?workspace=life", {
        method: "PUT",
        body: JSON.stringify({
          id: "card-1",
          title: "Card updated",
          content: "Text",
          source: "",
          type: "thought",
          sphere: "Life",
          tags: [],
          image: null,
          workspace: "life",
        }),
      }),
      {
        params: Promise.resolve({ id: "card-1" }),
      }
    );

    expect(response.status).toBe(200);
  });

  test("PUT persists editable fields including source", async () => {
    await writeCards([
      {
        id: "card-1",
        title: "Card",
        content: "Text",
        source: "Old source",
        type: "thought",
        sphere: "Life",
        tags: [],
        image: null,
        workspace: "life",
      },
    ]);

    const updateResponse = await PUT(
      new Request("http://localhost/api/cards/card-1?workspace=life", {
        method: "PUT",
        body: JSON.stringify({
          id: "card-1",
          title: "Card",
          content: "Text",
          source: "New source",
          type: "thought",
          sphere: "Life",
          tags: [],
          image: null,
          workspace: "life",
        }),
      }),
      {
        params: Promise.resolve({ id: "card-1" }),
      }
    );
    const getResponse = await GET(
      new Request("http://localhost/api/cards/card-1?workspace=life"),
      {
        params: Promise.resolve({ id: "card-1" }),
      }
    );
    const card = await getResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(card.source).toBe("New source");
  });

  test("DELETE returns 404 when workspace does not match", async () => {
    await writeCards([
      {
        id: "card-1",
        title: "Card",
        content: "Text",
        source: "",
        type: "thought",
        sphere: "Life",
        tags: [],
        image: null,
        workspace: "life",
      },
    ]);

    const response = await DELETE(
      new Request("http://localhost/api/cards/card-1?workspace=work", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ id: "card-1" }),
      }
    );

    expect(response.status).toBe(404);
  });
});
