import { describe, expect, test } from "vitest";

import {
  areColorsClose,
  createPreciseColorFromBase,
  createSoundColorProfile,
  findProblemNotes,
  recordCalibrationChoice,
  recordTrainingAttempt,
} from "@/lib/sound-color-trainer";

describe("sound color trainer domain", () => {
  test("saves calibration association with color confidence and reaction time", () => {
    const profile = createSoundColorProfile(1000);
    const updated = recordCalibrationChoice(profile, {
      noteId: "C4",
      color: createPreciseColorFromBase("poppy"),
      reactionTime: 1200,
      confidenceLevel: "mid",
      now: 2000,
    });
    const noteProfile = updated.noteProfiles.find((item) => item.noteId === "C4");

    expect(noteProfile?.baseColor?.baseId).toBe("poppy");
    expect(noteProfile?.calibrationSamples).toHaveLength(1);
    expect(noteProfile?.calibrationSamples[0]).toMatchObject({
      reactionTime: 1200,
      confidenceLevel: "mid",
    });
    expect(noteProfile?.calibrationSamples[0]?.color.baseId).toBe("poppy");
    expect(noteProfile?.confidenceScore).toBeGreaterThan(0);
  });

  test("checks sound to color matches against saved association", () => {
    const calibrated = recordCalibrationChoice(createSoundColorProfile(1000), {
      noteId: "C4",
      color: createPreciseColorFromBase("poppy"),
      reactionTime: 1000,
      confidenceLevel: "high",
      now: 2000,
    });
    const updated = recordTrainingAttempt(calibrated, {
      noteId: "C4",
      direction: "sound_to_color",
      selectedColor: createPreciseColorFromBase("poppy", { h: createPreciseColorFromBase("poppy").h + 4 }),
      reactionTime: 900,
      now: 3000,
    });
    const noteProfile = updated.noteProfiles.find((item) => item.noteId === "C4");

    expect(noteProfile?.trainingAttempts).toHaveLength(1);
    expect(noteProfile?.trainingAttempts[0]?.correct).toBe(true);
    expect(noteProfile?.stabilityScore).toBeGreaterThan(0.5);
  });

  test("detects unstable notes when colors drift across calibration attempts", () => {
    let profile = createSoundColorProfile(1000);

    profile = recordCalibrationChoice(profile, {
      noteId: "D4",
      color: createPreciseColorFromBase("poppy"),
      reactionTime: 1700,
      confidenceLevel: "low",
      now: 2000,
    });
    profile = recordCalibrationChoice(profile, {
      noteId: "D4",
      color: createPreciseColorFromBase("cobalt"),
      reactionTime: 2600,
      confidenceLevel: "low",
      now: 3000,
    });
    profile = recordTrainingAttempt(profile, {
      noteId: "D4",
      direction: "sound_to_color",
      selectedColor: createPreciseColorFromBase("cobalt"),
      reactionTime: 2800,
      now: 4000,
    });

    const problems = findProblemNotes(profile);
    const noteProblem = problems.find((item) => item.noteId === "D4");

    expect(noteProblem).toBeDefined();
    expect(noteProblem?.reasons).toContain("цвет меняется между попытками");
    expect(noteProblem?.reasons).toContain("низкая уверенность");
    expect(noteProblem?.reasons).toContain("медленная реакция");
  });

  test("keeps compatibility with legacy hex colors during normalization", () => {
    const normalized = recordCalibrationChoice(createSoundColorProfile(1000), {
      noteId: "E4",
      color: "#2F5DA8",
      reactionTime: 800,
      confidenceLevel: "high",
      now: 2000,
    });
    const noteProfile = normalized.noteProfiles.find((item) => item.noteId === "E4");

    expect(noteProfile?.baseColor?.hex).toBe("#2F5DA8");
    expect(noteProfile?.baseColor?.baseId).toBe("cobalt");
  });

  test("treats nearby precise shades as a valid match", () => {
    const reference = createPreciseColorFromBase("cobalt");
    const nearby = createPreciseColorFromBase("cobalt", {
      h: reference.h + 6,
      s: reference.s + 0.05,
      l: reference.l - 0.04,
    });

    expect(areColorsClose(reference, nearby)).toBe(true);
  });
});
