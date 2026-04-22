export type ConfidenceLevel = "low" | "mid" | "high";

export type TrainingDirection = "sound_to_color" | "color_to_sound";

export type TrainerUserState = "new" | "in_progress" | "reinforcement";

export type TrainerUiMode = "withColor" | "noColor";

export type NoteDefinition = {
  id: string;
  frequency: number;
  label: string;
};

export type ColorOption = {
  id: string;
  label: string;
  hex: string;
};

export type PreciseColor = {
  baseId: string;
  hex: string;
  h: number;
  s: number;
  l: number;
};

export type CalibrationSample = {
  color: PreciseColor;
  reactionTime: number;
  confidenceLevel: ConfidenceLevel;
  createdAt: number;
};

export type TrainingAttempt = {
  direction: TrainingDirection;
  selectedColor?: PreciseColor;
  selectedNoteId?: string;
  correct: boolean;
  reactionTime: number;
  createdAt: number;
};

export type NoteProfile = {
  noteId: string;
  baseColor?: PreciseColor;
  confidenceLevel?: ConfidenceLevel;
  confidenceScore: number;
  calibrationSamples: CalibrationSample[];
  trainingAttempts: TrainingAttempt[];
  stabilityScore: number;
  lastTrainedAt?: number;
};

export type SoundColorProfile = {
  version: 1;
  paletteId: string;
  uiMode: TrainerUiMode;
  noteProfiles: NoteProfile[];
  createdAt: number;
  updatedAt: number;
};

export type ProblemNote = {
  noteId: string;
  stabilityScore: number;
  averageReactionTime: number;
  confidenceScore: number;
  reasons: string[];
};

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

const CONFIDENCE_SCORES: Record<ConfidenceLevel, number> = {
  low: 0.25,
  mid: 0.6,
  high: 0.9,
};

const MAX_FAST_REACTION_MS = 2500;
const PROBLEM_STABILITY_THRESHOLD = 0.68;
const PROBLEM_CONFIDENCE_THRESHOLD = 0.45;
const PROBLEM_REACTION_THRESHOLD = 2200;
const DEFAULT_HUE_VARIANCE = 24;
const HUE_MATCH_THRESHOLD = 10;
const SATURATION_MATCH_THRESHOLD = 0.18;
const LIGHTNESS_MATCH_THRESHOLD = 0.18;

export const SOUND_COLOR_STORAGE_KEY = "sound-color-trainer-profile-v1";

export const NOTE_DEFINITIONS: NoteDefinition[] = [
  { id: "C4", label: "C4", frequency: 261.63 },
  { id: "C#4", label: "C#4", frequency: 277.18 },
  { id: "D4", label: "D4", frequency: 293.66 },
  { id: "D#4", label: "D#4", frequency: 311.13 },
  { id: "E4", label: "E4", frequency: 329.63 },
  { id: "F4", label: "F4", frequency: 349.23 },
  { id: "F#4", label: "F#4", frequency: 369.99 },
  { id: "G4", label: "G4", frequency: 392.0 },
  { id: "G#4", label: "G#4", frequency: 415.3 },
  { id: "A4", label: "A4", frequency: 440.0 },
  { id: "A#4", label: "A#4", frequency: 466.16 },
  { id: "B4", label: "B4", frequency: 493.88 },
];

export const COLOR_PALETTE: ColorOption[] = [
  { id: "ember", label: "Уголь", hex: "#2F2A28" },
  { id: "clay", label: "Глина", hex: "#8C4F3D" },
  { id: "poppy", label: "Мак", hex: "#D1495B" },
  { id: "amber", label: "Янтарь", hex: "#EDA63B" },
  { id: "wheat", label: "Песок", hex: "#E7D3A8" },
  { id: "moss", label: "Мох", hex: "#6C8A3B" },
  { id: "lagoon", label: "Лагуна", hex: "#2D8C8A" },
  { id: "cobalt", label: "Кобальт", hex: "#2F5DA8" },
  { id: "indigo", label: "Индиго", hex: "#484D9A" },
  { id: "rose", label: "Роза", hex: "#C970A2" },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function clampHue(value: number) {
  const normalized = value % 360;

  return normalized < 0 ? normalized + 360 : normalized;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeReactionScore(reactionTime: number) {
  return clamp(1 - reactionTime / MAX_FAST_REACTION_MS);
}

function padHex(value: number) {
  return value.toString(16).padStart(2, "0");
}

function getHueDistance(left: number, right: number) {
  const rawDistance = Math.abs(clampHue(left) - clampHue(right));

  return Math.min(rawDistance, 360 - rawDistance);
}

function hexToRgb(hex: string): RgbColor | null {
  const normalized = hex.trim().replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: RgbColor) {
  return `#${padHex(rgb.r)}${padHex(rgb.g)}${padHex(rgb.b)}`.toUpperCase();
}

function rgbToHsl(rgb: RgbColor) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;

  if (max === r) {
    h = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
    h = 60 * ((b - r) / delta + 2);
  } else {
    h = 60 * ((r - g) / delta + 4);
  }

  return {
    h: clampHue(h),
    s,
    l,
  };
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  const hue = clampHue(h);
  const saturation = clamp(s);
  const lightness = clamp(l);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = secondary;
  } else if (hue < 120) {
    red = secondary;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = secondary;
  } else if (hue < 240) {
    green = secondary;
    blue = chroma;
  } else if (hue < 300) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

export function hslToHex(h: number, s: number, l: number) {
  return rgbToHex(hslToRgb(h, s, l));
}

export function getColorOptionById(baseId: string) {
  return COLOR_PALETTE.find((option) => option.id === baseId);
}

function getNearestBaseColorOption(hex: string) {
  const rgb = hexToRgb(hex);
  const fallback = COLOR_PALETTE[0];

  if (!rgb) {
    return fallback;
  }

  const parsed = rgbToHsl(rgb);

  let selected = fallback;
  let selectedDistance = Number.POSITIVE_INFINITY;

  for (const option of COLOR_PALETTE) {
    const optionColor = createPreciseColorFromBase(option.id);
    const hueDistance = getHueDistance(parsed.h, optionColor.h) / 180;
    const saturationDistance = Math.abs(parsed.s - optionColor.s);
    const lightnessDistance = Math.abs(parsed.l - optionColor.l);
    const totalDistance = hueDistance * 0.5 + saturationDistance * 0.25 + lightnessDistance * 0.25;

    if (totalDistance < selectedDistance) {
      selected = option;
      selectedDistance = totalDistance;
    }
  }

  return selected;
}

export function getBoundedHueRange(baseId: string, variance = DEFAULT_HUE_VARIANCE) {
  const baseColor = createPreciseColorFromBase(baseId);

  return {
    min: clampHue(baseColor.h - variance),
    max: clampHue(baseColor.h + variance),
    center: baseColor.h,
  };
}

export function getBoundedHue(baseId: string, hue: number, variance = DEFAULT_HUE_VARIANCE) {
  const baseColor = createPreciseColorFromBase(baseId);
  const normalizedHue = clampHue(hue);
  const distance = getHueDistance(normalizedHue, baseColor.h);

  if (distance <= variance) {
    return normalizedHue;
  }

  const clockwise = clampHue(baseColor.h + variance);
  const counterClockwise = clampHue(baseColor.h - variance);
  const clockwiseDistance = getHueDistance(normalizedHue, clockwise);
  const counterClockwiseDistance = getHueDistance(normalizedHue, counterClockwise);

  return clockwiseDistance < counterClockwiseDistance ? clockwise : counterClockwise;
}

export function createPreciseColorFromBase(
  baseId: string,
  overrides?: Partial<Pick<PreciseColor, "h" | "s" | "l">>
): PreciseColor {
  const option = getColorOptionById(baseId) ?? COLOR_PALETTE[0];
  const baseRgb = hexToRgb(option.hex) ?? { r: 0, g: 0, b: 0 };
  const baseHsl = rgbToHsl(baseRgb);
  const boundedHue = getBoundedHue(option.id, overrides?.h ?? baseHsl.h);
  const saturation = clamp(overrides?.s ?? baseHsl.s);
  const lightness = clamp(overrides?.l ?? baseHsl.l);

  return {
    baseId: option.id,
    h: boundedHue,
    s: saturation,
    l: lightness,
    hex: hslToHex(boundedHue, saturation, lightness),
  };
}

export function normalizePreciseColor(value: unknown): PreciseColor | null {
  if (typeof value === "string") {
    const rgb = hexToRgb(value);

    if (!rgb) {
      return null;
    }

    const nearestBase = getNearestBaseColorOption(value);
    const hsl = rgbToHsl(rgb);

    return {
      baseId: nearestBase.id,
      hex: rgbToHex(rgb),
      h: hsl.h,
      s: hsl.s,
      l: hsl.l,
    };
  }

  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const baseId = typeof record.baseId === "string" ? record.baseId : "";
  const hex = typeof record.hex === "string" ? record.hex : "";
  const option = getColorOptionById(baseId) ?? (hex ? getNearestBaseColorOption(hex) : COLOR_PALETTE[0]);

  if (hex) {
    const rgb = hexToRgb(hex);

    if (rgb) {
      const hslFromHex = rgbToHsl(rgb);
      const hue =
        typeof record.h === "number" && Number.isFinite(record.h)
          ? getBoundedHue(option.id, record.h)
          : getBoundedHue(option.id, hslFromHex.h);
      const saturation =
        typeof record.s === "number" && Number.isFinite(record.s) ? clamp(record.s) : hslFromHex.s;
      const lightness =
        typeof record.l === "number" && Number.isFinite(record.l) ? clamp(record.l) : hslFromHex.l;

      return {
        baseId: option.id,
        h: hue,
        s: saturation,
        l: lightness,
        hex: hslToHex(hue, saturation, lightness),
      };
    }
  }

  if (baseId) {
    return createPreciseColorFromBase(baseId, {
      h: typeof record.h === "number" ? record.h : undefined,
      s: typeof record.s === "number" ? record.s : undefined,
      l: typeof record.l === "number" ? record.l : undefined,
    });
  }

  return null;
}

export function areColorsClose(left?: PreciseColor, right?: PreciseColor) {
  if (!left || !right) {
    return false;
  }

  if (left.hex === right.hex) {
    return true;
  }

  if (left.baseId !== right.baseId) {
    return false;
  }

  return (
    getHueDistance(left.h, right.h) <= HUE_MATCH_THRESHOLD &&
    Math.abs(left.s - right.s) <= SATURATION_MATCH_THRESHOLD &&
    Math.abs(left.l - right.l) <= LIGHTNESS_MATCH_THRESHOLD
  );
}

function getColorIdentity(color?: PreciseColor) {
  return color ? `${color.baseId}:${color.hex}` : "";
}

function createEmptyNoteProfile(noteId: string): NoteProfile {
  return {
    noteId,
    confidenceScore: 0,
    calibrationSamples: [],
    trainingAttempts: [],
    stabilityScore: 0,
  };
}

function normalizeConfidenceLevel(value: unknown): ConfidenceLevel | undefined {
  return value === "low" || value === "mid" || value === "high" ? value : undefined;
}

function normalizeTrainingDirection(value: unknown): TrainingDirection | undefined {
  return value === "sound_to_color" || value === "color_to_sound" ? value : undefined;
}

function normalizeCalibrationSample(value: unknown): CalibrationSample | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const color = normalizePreciseColor(record.color);
  const confidenceLevel = normalizeConfidenceLevel(record.confidenceLevel);

  if (!color || !confidenceLevel) {
    return null;
  }

  return {
    color,
    reactionTime:
      typeof record.reactionTime === "number" && Number.isFinite(record.reactionTime)
        ? Math.max(0, record.reactionTime)
        : 0,
    confidenceLevel,
    createdAt:
      typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
        ? record.createdAt
        : Date.now(),
  };
}

function normalizeTrainingAttempt(value: unknown): TrainingAttempt | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const direction = normalizeTrainingDirection(record.direction);

  if (!direction) {
    return null;
  }

  return {
    direction,
    selectedColor: normalizePreciseColor(record.selectedColor),
    selectedNoteId:
      typeof record.selectedNoteId === "string" ? record.selectedNoteId : undefined,
    correct: record.correct === true,
    reactionTime:
      typeof record.reactionTime === "number" && Number.isFinite(record.reactionTime)
        ? Math.max(0, record.reactionTime)
        : 0,
    createdAt:
      typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
        ? record.createdAt
        : Date.now(),
  };
}

function getDominantColor(samples: CalibrationSample[]) {
  const counts = new Map<string, number>();

  for (const sample of samples) {
    const key = getColorIdentity(sample.color);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let selectedColor: PreciseColor | undefined;
  let highestCount = 0;

  for (const sample of [...samples].reverse()) {
    const key = getColorIdentity(sample.color);
    const count = counts.get(key) ?? 0;

    if (count >= highestCount) {
      selectedColor = sample.color;
      highestCount = count;
    }
  }

  return selectedColor;
}

function normalizeNoteProfile(value: unknown, noteId: string): NoteProfile {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const calibrationSamples = Array.isArray(record.calibrationSamples)
    ? record.calibrationSamples
        .map((sample) => normalizeCalibrationSample(sample))
        .filter((sample): sample is CalibrationSample => sample !== null)
    : [];
  const trainingAttempts = Array.isArray(record.trainingAttempts)
    ? record.trainingAttempts
        .map((attempt) => normalizeTrainingAttempt(attempt))
        .filter((attempt): attempt is TrainingAttempt => attempt !== null)
    : [];

  const merged: NoteProfile = {
    noteId,
    baseColor: normalizePreciseColor(record.baseColor),
    confidenceLevel: normalizeConfidenceLevel(record.confidenceLevel),
    confidenceScore:
      typeof record.confidenceScore === "number" && Number.isFinite(record.confidenceScore)
        ? clamp(record.confidenceScore)
        : 0,
    calibrationSamples,
    trainingAttempts,
    stabilityScore:
      typeof record.stabilityScore === "number" && Number.isFinite(record.stabilityScore)
        ? clamp(record.stabilityScore)
        : 0,
    lastTrainedAt:
      typeof record.lastTrainedAt === "number" && Number.isFinite(record.lastTrainedAt)
        ? record.lastTrainedAt
        : undefined,
  };

  return recomputeNoteProfile(merged);
}

export function calculateStabilityScore(noteProfile: NoteProfile) {
  if (!noteProfile.baseColor) {
    return 0;
  }

  const calibrationAgreement =
    noteProfile.calibrationSamples.length === 0
      ? 0
      : noteProfile.calibrationSamples.filter((sample) => areColorsClose(sample.color, noteProfile.baseColor))
            .length / noteProfile.calibrationSamples.length;
  const trainingAccuracy =
    noteProfile.trainingAttempts.length === 0
      ? 0
      : noteProfile.trainingAttempts.filter((attempt) => attempt.correct).length /
        noteProfile.trainingAttempts.length;
  const reactionValues = [
    ...noteProfile.calibrationSamples.map((sample) => sample.reactionTime),
    ...noteProfile.trainingAttempts.map((attempt) => attempt.reactionTime),
  ];
  const reactionScore = average(reactionValues.map((reactionTime) => normalizeReactionScore(reactionTime)));

  return clamp(
    calibrationAgreement * 0.35 +
      trainingAccuracy * 0.35 +
      noteProfile.confidenceScore * 0.2 +
      reactionScore * 0.1
  );
}

function recomputeNoteProfile(noteProfile: NoteProfile): NoteProfile {
  const baseColor = getDominantColor(noteProfile.calibrationSamples) ?? noteProfile.baseColor;
  const confidenceValues = noteProfile.calibrationSamples.map(
    (sample) => CONFIDENCE_SCORES[sample.confidenceLevel]
  );
  const confidenceScore = confidenceValues.length > 0 ? average(confidenceValues) : 0;
  const lastConfidence = noteProfile.calibrationSamples.at(-1)?.confidenceLevel;

  const nextProfile: NoteProfile = {
    ...noteProfile,
    baseColor,
    confidenceLevel: lastConfidence ?? noteProfile.confidenceLevel,
    confidenceScore,
  };

  return {
    ...nextProfile,
    stabilityScore: calculateStabilityScore(nextProfile),
  };
}

export function createSoundColorProfile(now = Date.now()): SoundColorProfile {
  return {
    version: 1,
    paletteId: "default-10",
    uiMode: "withColor",
    noteProfiles: NOTE_DEFINITIONS.map((note) => createEmptyNoteProfile(note.id)),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeSoundColorProfile(value: unknown): SoundColorProfile {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const noteProfilesInput = Array.isArray(record.noteProfiles) ? record.noteProfiles : [];
  const indexedProfiles = new Map<string, unknown>();

  for (const item of noteProfilesInput) {
    if (item && typeof item === "object") {
      const noteId = typeof (item as Record<string, unknown>).noteId === "string"
        ? ((item as Record<string, unknown>).noteId as string)
        : "";

      if (noteId) {
        indexedProfiles.set(noteId, item);
      }
    }
  }

  return {
    version: 1,
    paletteId: typeof record.paletteId === "string" ? record.paletteId : "default-10",
    uiMode: record.uiMode === "noColor" ? "noColor" : "withColor",
    noteProfiles: NOTE_DEFINITIONS.map((note) =>
      normalizeNoteProfile(indexedProfiles.get(note.id), note.id)
    ),
    createdAt:
      typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
        ? record.createdAt
        : Date.now(),
    updatedAt:
      typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : Date.now(),
  };
}

function updateNoteProfile(
  profile: SoundColorProfile,
  noteId: string,
  updater: (noteProfile: NoteProfile) => NoteProfile,
  now: number
) {
  return {
    ...profile,
    updatedAt: now,
    noteProfiles: profile.noteProfiles.map((noteProfile) =>
      noteProfile.noteId === noteId ? updater(noteProfile) : noteProfile
    ),
  };
}

export function setTrainerUiMode(
  profile: SoundColorProfile,
  uiMode: TrainerUiMode,
  now = Date.now()
) {
  return {
    ...profile,
    uiMode,
    updatedAt: now,
  };
}

export function recordCalibrationChoice(
  profile: SoundColorProfile,
  input: {
    noteId: string;
    color: PreciseColor | string;
    reactionTime: number;
    confidenceLevel: ConfidenceLevel;
    now?: number;
  }
) {
  const now = input.now ?? Date.now();
  const normalizedColor = normalizePreciseColor(input.color);

  if (!normalizedColor) {
    return profile;
  }

  return updateNoteProfile(
    profile,
    input.noteId,
    (noteProfile) =>
      recomputeNoteProfile({
        ...noteProfile,
        calibrationSamples: [
          ...noteProfile.calibrationSamples,
          {
            color: normalizedColor,
            reactionTime: Math.max(0, input.reactionTime),
            confidenceLevel: input.confidenceLevel,
            createdAt: now,
          },
        ].slice(-20),
      }),
    now
  );
}

export function recordTrainingAttempt(
  profile: SoundColorProfile,
  input: {
    noteId: string;
    direction: TrainingDirection;
    reactionTime: number;
    selectedColor?: PreciseColor | string;
    selectedNoteId?: string;
    now?: number;
  }
) {
  const now = input.now ?? Date.now();
  const selectedColor = normalizePreciseColor(input.selectedColor);

  return updateNoteProfile(
    profile,
    input.noteId,
    (noteProfile) => {
      const correct =
        input.direction === "sound_to_color"
          ? Boolean(noteProfile.baseColor && selectedColor && areColorsClose(selectedColor, noteProfile.baseColor))
          : input.selectedNoteId === noteProfile.noteId;

      return recomputeNoteProfile({
        ...noteProfile,
        trainingAttempts: [
          ...noteProfile.trainingAttempts,
          {
            direction: input.direction,
            selectedColor: selectedColor ?? undefined,
            selectedNoteId: input.selectedNoteId,
            correct,
            reactionTime: Math.max(0, input.reactionTime),
            createdAt: now,
          },
        ].slice(-40),
        lastTrainedAt: now,
      });
    },
    now
  );
}

export function getTrainerUserState(profile: SoundColorProfile): TrainerUserState {
  const calibratedCount = profile.noteProfiles.filter((noteProfile) => noteProfile.baseColor).length;

  if (calibratedCount === 0) {
    return "new";
  }

  if (calibratedCount < NOTE_DEFINITIONS.length) {
    return "in_progress";
  }

  return "reinforcement";
}

export function findProblemNotes(profile: SoundColorProfile): ProblemNote[] {
  return profile.noteProfiles
    .map((noteProfile) => {
      const reasons: string[] = [];
      const reactionValues = [
        ...noteProfile.calibrationSamples.map((sample) => sample.reactionTime),
        ...noteProfile.trainingAttempts.map((attempt) => attempt.reactionTime),
      ];
      const averageReactionTime = average(reactionValues);
      const uniqueCalibrationColors = new Set(
        noteProfile.calibrationSamples.map((sample) => getColorIdentity(sample.color))
      );

      if (!noteProfile.baseColor) {
        reasons.push("нет сохранённой ассоциации");
      }

      if (uniqueCalibrationColors.size > 1) {
        reasons.push("цвет меняется между попытками");
      }

      if (noteProfile.stabilityScore > 0 && noteProfile.stabilityScore < PROBLEM_STABILITY_THRESHOLD) {
        reasons.push("низкая стабильность");
      }

      if (
        noteProfile.confidenceScore > 0 &&
        noteProfile.confidenceScore < PROBLEM_CONFIDENCE_THRESHOLD
      ) {
        reasons.push("низкая уверенность");
      }

      if (averageReactionTime > PROBLEM_REACTION_THRESHOLD) {
        reasons.push("медленная реакция");
      }

      return {
        noteId: noteProfile.noteId,
        stabilityScore: noteProfile.stabilityScore,
        averageReactionTime,
        confidenceScore: noteProfile.confidenceScore,
        reasons,
      };
    })
    .filter((problem) => problem.reasons.length > 0)
    .sort((left, right) => left.stabilityScore - right.stabilityScore);
}

export function getCalibratedNoteProfiles(profile: SoundColorProfile) {
  return profile.noteProfiles.filter((noteProfile) => Boolean(noteProfile.baseColor));
}

export function getNextProblemNoteId(profile: SoundColorProfile, round: number) {
  const calibrated = getCalibratedNoteProfiles(profile);

  if (calibrated.length === 0) {
    return undefined;
  }

  const problems = findProblemNotes(profile)
    .map((problem) => profile.noteProfiles.find((noteProfile) => noteProfile.noteId === problem.noteId))
    .filter((noteProfile): noteProfile is NoteProfile => Boolean(noteProfile?.baseColor));
  const pool = problems.length > 0 ? problems : calibrated;

  return pool[round % pool.length]?.noteId;
}
