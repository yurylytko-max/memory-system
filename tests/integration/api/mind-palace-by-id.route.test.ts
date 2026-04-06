import { describe, expect, test } from "vitest";

import { GET, PUT } from "@/app/api/mind-palaces/[id]/route";
import { createMindPalace } from "@/lib/mind-palaces";
import { writeMindPalaces } from "@/lib/server/mind-palaces-store";

describe("mind palace by id route", () => {
  test("GET returns a single palace", async () => {
    const palace = createMindPalace({ title: "Квартира" });
    await writeMindPalaces([palace]);

    const response = await GET(new Request("http://localhost/api/mind-palaces"), {
      params: Promise.resolve({ id: palace.id }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.item.id).toBe(palace.id);
  });

  test("PUT saves a valid linear route", async () => {
    const palace = createMindPalace({ title: "Квартира" });
    await writeMindPalaces([palace]);

    const response = await PUT(
      new Request(`http://localhost/api/mind-palaces/${palace.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: palace.title,
          loci: ["дверь", "коврик", "вешалка", "зеркало", "тумба"].map((cue, index) => ({
            position: index + 1,
            description: cue,
            cue,
            linked_images: [],
          })),
        }),
      }),
      {
        params: Promise.resolve({ id: palace.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.item.route.loci).toHaveLength(5);
    expect(payload.item.stage).toBe("fixation");
  });

  test("PUT rejects routes with fewer than five points", async () => {
    const palace = createMindPalace({ title: "Квартира" });
    await writeMindPalaces([palace]);

    const response = await PUT(
      new Request(`http://localhost/api/mind-palaces/${palace.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: palace.title,
          loci: ["дверь", "коврик", "вешалка", "зеркало"].map((cue, index) => ({
            position: index + 1,
            description: cue,
            cue,
            linked_images: [],
          })),
        }),
      }),
      {
        params: Promise.resolve({ id: palace.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("В маршруте должно быть минимум 5 точек.");
  });

  test("PUT rejects abstract points", async () => {
    const palace = createMindPalace({ title: "Квартира" });
    await writeMindPalaces([palace]);

    const response = await PUT(
      new Request(`http://localhost/api/mind-palaces/${palace.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: palace.title,
          loci: ["идея", "коврик", "вешалка", "зеркало", "тумба"].map((cue, index) => ({
            position: index + 1,
            description: cue,
            cue,
            linked_images: [],
          })),
        }),
      }),
      {
        params: Promise.resolve({ id: palace.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Точка должна быть конкретным визуальным образом, а не абстракцией.");
  });
});
