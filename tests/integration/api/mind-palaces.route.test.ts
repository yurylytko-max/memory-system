import { describe, expect, test } from "vitest";

import { GET, POST } from "@/app/api/mind-palaces/route";
import { readMindPalaces } from "@/lib/server/mind-palaces-store";

describe("mind palaces route", () => {
  test("GET returns an empty list by default", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items).toEqual([]);
  });

  test("POST creates a dedicated palace record", async () => {
    const response = await POST(
      new Request("http://localhost/api/mind-palaces", {
        method: "POST",
        body: JSON.stringify({
          title: "Моя квартира",
        }),
      })
    );
    const payload = await response.json();
    const stored = await readMindPalaces();

    expect(response.status).toBe(200);
    expect(payload.item.title).toBe("Моя квартира");
    expect(payload.item.type).toBe("memory_palace");
    expect(payload.item.status).toBe("in_progress");
    expect(stored).toHaveLength(1);
  });

  test("POST rejects empty title", async () => {
    const response = await POST(
      new Request("http://localhost/api/mind-palaces", {
        method: "POST",
        body: JSON.stringify({
          title: "",
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Нужно короткое название чертога.");
  });
});
