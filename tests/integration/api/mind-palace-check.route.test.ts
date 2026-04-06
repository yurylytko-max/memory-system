import { describe, expect, test } from "vitest";

import { POST } from "@/app/api/mind-palaces/[id]/check/route";
import { normalizeMindPalaces } from "@/lib/mind-palaces";
import { readMindPalaces, writeMindPalaces } from "@/lib/server/mind-palaces-store";

describe("mind palace check route", () => {
  function createStoredPalace() {
    return normalizeMindPalaces([
      {
        id: "palace-1",
        title: "Квартира",
        route: {
          loci: [
            { position: 1, description: "дверь", cue: "дверь", linked_images: [] },
            { position: 2, description: "коврик", cue: "коврик", linked_images: [] },
            { position: 3, description: "вешалка", cue: "вешалка", linked_images: [] },
            { position: 4, description: "зеркало", cue: "зеркало", linked_images: [] },
            { position: 5, description: "тумба", cue: "тумба", linked_images: [] },
          ],
        },
      },
    ])[0];
  }

  test("forward check accepts the correct next locus", async () => {
    await writeMindPalaces([createStoredPalace()]);

    const response = await POST(
      new Request("http://localhost/api/mind-palaces/palace-1/check", {
        method: "POST",
        body: JSON.stringify({
          mode: "forward",
          anchor_position: 1,
          answer: "коврик",
        }),
      }),
      {
        params: Promise.resolve({ id: "palace-1" }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.item.verification.forward_passed).toBe(true);
    expect(payload.item.status).toBe("in_progress");
  });

  test("backward check accepts the correct previous locus", async () => {
    const palace = createStoredPalace();
    palace.verification.forward_passed = true;
    await writeMindPalaces([palace]);

    const response = await POST(
      new Request("http://localhost/api/mind-palaces/palace-1/check", {
        method: "POST",
        body: JSON.stringify({
          mode: "backward",
          anchor_position: 4,
          answer: "вешалка",
        }),
      }),
      {
        params: Promise.resolve({ id: "palace-1" }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.item.verification.backward_passed).toBe(true);
  });

  test("random access check accepts the correct locus by number", async () => {
    const palace = createStoredPalace();
    palace.verification.forward_passed = true;
    palace.verification.backward_passed = true;
    await writeMindPalaces([palace]);

    const response = await POST(
      new Request("http://localhost/api/mind-palaces/palace-1/check", {
        method: "POST",
        body: JSON.stringify({
          mode: "random_access",
          target_position: 5,
          answer: "тумба",
        }),
      }),
      {
        params: Promise.resolve({ id: "palace-1" }),
      }
    );
    const payload = await response.json();
    const stored = await readMindPalaces();

    expect(response.status).toBe(200);
    expect(payload.item.verification.random_access_passed).toBe(true);
    expect(payload.item.status).toBe("stable");
    expect(stored[0].status).toBe("stable");
  });

  test("failed check returns palace to route fixation", async () => {
    await writeMindPalaces([createStoredPalace()]);

    const response = await POST(
      new Request("http://localhost/api/mind-palaces/palace-1/check", {
        method: "POST",
        body: JSON.stringify({
          mode: "forward",
          anchor_position: 1,
          answer: "тумба",
        }),
      }),
      {
        params: Promise.resolve({ id: "palace-1" }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.item.stage).toBe("fixation");
    expect(payload.item.status).toBe("in_progress");
  });

  test("invalid point number returns 400", async () => {
    await writeMindPalaces([createStoredPalace()]);

    const response = await POST(
      new Request("http://localhost/api/mind-palaces/palace-1/check", {
        method: "POST",
        body: JSON.stringify({
          mode: "random_access",
          target_position: 9,
          answer: "ничего",
        }),
      }),
      {
        params: Promise.resolve({ id: "palace-1" }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Нужна существующая точка маршрута.");
  });
});
