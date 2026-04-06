import { describe, expect, test } from "vitest";

import {
  createMindPalace,
  normalizeMindPalaces,
  runMindPalaceCheck,
  updateMindPalaceRoute,
  validateMindPalaceRoute,
} from "@/lib/mind-palaces";

describe("mind palaces domain", () => {
  test("creates a dedicated palace domain with in-progress status by default", () => {
    const palace = createMindPalace({ title: "Моя квартира" });

    expect(palace.type).toBe("memory_palace");
    expect(palace.status).toBe("in_progress");
    expect(palace.stage).toBe("creation");
    expect(palace.route.loci).toEqual([]);
  });

  test("rejects route shorter than five loci", () => {
    const [palace] = normalizeMindPalaces([{ title: "Квартира" }]);
    const result = updateMindPalaceRoute(
      palace,
      ["дверь", "коврик", "вешалка", "зеркало"].map((cue, index) => ({
        position: index + 1,
        description: cue,
        cue,
        linked_images: [],
      }))
    );

    expect(result.error).toBe("В маршруте должно быть минимум 5 точек.");
  });

  test("rejects route longer than fifteen loci", () => {
    const routeError = validateMindPalaceRoute({
      loci: Array.from({ length: 16 }, (_, index) => ({
        position: index + 1,
        description: `точка${index + 1}`,
        cue: `точка${index + 1}`,
        linked_images: [],
      })),
    });

    expect(routeError).toBe("В маршруте может быть максимум 15 точек.");
  });

  test("rejects gaps and jumps in route order", () => {
    const routeError = validateMindPalaceRoute({
      loci: [
        { position: 1, description: "дверь", cue: "дверь", linked_images: [] },
        { position: 3, description: "коврик", cue: "коврик", linked_images: [] },
        { position: 4, description: "вешалка", cue: "вешалка", linked_images: [] },
        { position: 5, description: "зеркало", cue: "зеркало", linked_images: [] },
        { position: 6, description: "тумба", cue: "тумба", linked_images: [] },
      ],
    });

    expect(routeError).toBe("Маршрут должен быть строго линейным, без пропусков и прыжков.");
  });

  test("rejects abstract locus descriptions", () => {
    const routeError = validateMindPalaceRoute({
      loci: [
        { position: 1, description: "идея", cue: "идея", linked_images: [] },
        { position: 2, description: "коврик", cue: "коврик", linked_images: [] },
        { position: 3, description: "вешалка", cue: "вешалка", linked_images: [] },
        { position: 4, description: "зеркало", cue: "зеркало", linked_images: [] },
        { position: 5, description: "тумба", cue: "тумба", linked_images: [] },
      ],
    });

    expect(routeError).toBe("Точка должна быть конкретным визуальным образом, а не абстракцией.");
  });

  test("keeps route linear and sends palace to fixation after valid save", () => {
    const [palace] = normalizeMindPalaces([{ title: "Квартира" }]);
    const result = updateMindPalaceRoute(
      palace,
      ["дверь", "коврик", "вешалка", "зеркало", "тумба"].map((cue, index) => ({
        position: index + 1,
        description: cue,
        cue,
        linked_images: [],
      }))
    );

    expect(result.error).toBeUndefined();
    expect(result.palace?.stage).toBe("fixation");
    expect(result.palace?.route.loci.map((locus) => locus.position)).toEqual([1, 2, 3, 4, 5]);
  });

  test("does not allow stable status before forward backward and random checks pass", () => {
    const [palace] = normalizeMindPalaces([
      {
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
    ]);
    const result = runMindPalaceCheck(palace, {
      mode: "forward",
      anchor_position: 1,
      answer: "коврик",
    });

    expect(result.palace?.status).toBe("in_progress");
    expect(result.palace?.stage).toBe("reinforcement");
  });

  test("validates forward backward and random checks and stabilizes palace only after all of them", () => {
    const [palace] = normalizeMindPalaces([
      {
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
    ]);

    const forward = runMindPalaceCheck(palace, {
      mode: "forward",
      anchor_position: 1,
      answer: "коврик",
    }).palace;
    const backward = runMindPalaceCheck(forward!, {
      mode: "backward",
      anchor_position: 4,
      answer: "вешалка",
    }).palace;
    const random = runMindPalaceCheck(backward!, {
      mode: "random_access",
      target_position: 5,
      answer: "тумба",
    }).palace;

    expect(forward?.verification.forward_passed).toBe(true);
    expect(backward?.verification.backward_passed).toBe(true);
    expect(random?.verification.random_access_passed).toBe(true);
    expect(random?.status).toBe("stable");
    expect(random?.stage).toBe("ready_for_information");
  });

  test("returns palace to fixation after a failed check", () => {
    const [palace] = normalizeMindPalaces([
      {
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
    ]);
    const result = runMindPalaceCheck(palace, {
      mode: "random_access",
      target_position: 3,
      answer: "зеркало",
    });

    expect(result.palace?.status).toBe("in_progress");
    expect(result.palace?.stage).toBe("fixation");
    expect(result.palace?.verification.forward_passed).toBe(false);
    expect(result.palace?.verification.random_access_passed).toBe(false);
  });
});
