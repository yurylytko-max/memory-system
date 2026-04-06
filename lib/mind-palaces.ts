export type MindPalaceStatus = "in_progress" | "stable";

export type MindPalaceType = "memory_palace";

export type MindPalaceStage =
  | "creation"
  | "fixation"
  | "verification"
  | "reinforcement"
  | "ready_for_information";

export type MindPalaceCheckMode = "forward" | "backward" | "random_access";

export type MindPalaceImageType = "simple" | "attachment";

export type MindPalaceImage = {
  id: string;
  type: MindPalaceImageType;
  structure?: string;
};

export type MindPalaceLocus = {
  position: number;
  description: string;
  cue: string;
  linked_images: MindPalaceImage[];
};

export type MindPalaceRoute = {
  loci: MindPalaceLocus[];
};

export type MindPalaceCheckRecord = {
  mode: MindPalaceCheckMode;
  prompt: string;
  expected_answer: string;
  answer: string;
  success: boolean;
  checked_at: string;
};

export type MindPalaceVerificationState = {
  forward_passed: boolean;
  backward_passed: boolean;
  random_access_passed: boolean;
  history: MindPalaceCheckRecord[];
};

export type MindPalace = {
  id: string;
  title: string;
  type: MindPalaceType;
  status: MindPalaceStatus;
  stage: MindPalaceStage;
  route: MindPalaceRoute;
  verification: MindPalaceVerificationState;
  created_at: string;
  updated_at: string;
};

export type MindPalaceCheckInput =
  | {
      mode: "forward";
      anchor_position: number;
      answer: string;
    }
  | {
      mode: "backward";
      anchor_position: number;
      answer: string;
    }
  | {
      mode: "random_access";
      target_position: number;
      answer: string;
    };

const ABSTRACT_LOCUS_WORDS = new Set([
  "идея",
  "мысль",
  "концепция",
  "понятие",
  "абстракция",
  "эмоция",
  "чувство",
  "радость",
  "грусть",
  "страх",
  "любовь",
  "история",
  "сюжет",
  "список",
  "план",
  "система",
  "информация",
  "данные",
  "связь",
  "маршрут",
  "место",
]);

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeShortString(value: unknown, maxLength = 80) {
  return normalizeString(value).slice(0, maxLength);
}

function normalizeIsoDate(value: unknown, fallback: string) {
  const date = typeof value === "string" ? new Date(value) : new Date(Number.NaN);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toISOString();
}

function createMindPalaceId(index: number) {
  return `mind-palace-${Date.now()}-${index}`;
}

function createMindPalaceImageId(index: number) {
  return `mind-palace-image-${Date.now()}-${index}`;
}

function normalizeMindPalaceStatus(value: unknown): MindPalaceStatus {
  return value === "stable" ? "stable" : "in_progress";
}

function normalizeMindPalaceStage(value: unknown): MindPalaceStage {
  return value === "fixation" ||
    value === "verification" ||
    value === "reinforcement" ||
    value === "ready_for_information"
    ? value
    : "creation";
}

function normalizeMindPalaceImageType(value: unknown): MindPalaceImageType {
  return value === "attachment" ? "attachment" : "simple";
}

function normalizeLocus(value: unknown, index: number): MindPalaceLocus {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawPosition = Number(record.position);
  const linkedImages = Array.isArray(record.linked_images) ? record.linked_images : [];

  return {
    position: Number.isInteger(rawPosition) && rawPosition > 0 ? rawPosition : index + 1,
    description: normalizeShortString(record.description, 60),
    cue: normalizeShortString(record.cue, 60) || normalizeShortString(record.description, 60),
    linked_images: linkedImages
      .map((image, imageIndex) => normalizeMindPalaceImage(image, imageIndex))
      .filter((image): image is MindPalaceImage => image !== null),
  };
}

function normalizeMindPalaceImage(value: unknown, index: number): MindPalaceImage | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: normalizeString(record.id) || createMindPalaceImageId(index),
    type: normalizeMindPalaceImageType(record.type),
    structure: normalizeShortString(record.structure, 120) || undefined,
  };
}

function normalizeVerificationState(
  value: unknown,
  fallbackNow: string
): MindPalaceVerificationState {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawHistory = Array.isArray(record.history) ? record.history : [];

  return {
    forward_passed: record.forward_passed === true,
    backward_passed: record.backward_passed === true,
    random_access_passed: record.random_access_passed === true,
    history: rawHistory
      .map((entry) => normalizeCheckRecord(entry, fallbackNow))
      .filter((entry): entry is MindPalaceCheckRecord => entry !== null)
      .slice(-20),
  };
}

function normalizeCheckRecord(
  value: unknown,
  fallbackNow: string
): MindPalaceCheckRecord | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const mode = record.mode;

  if (mode !== "forward" && mode !== "backward" && mode !== "random_access") {
    return null;
  }

  return {
    mode,
    prompt: normalizeShortString(record.prompt, 160),
    expected_answer: normalizeShortString(record.expected_answer, 60),
    answer: normalizeShortString(record.answer, 60),
    success: record.success === true,
    checked_at: normalizeIsoDate(record.checked_at, fallbackNow),
  };
}

function sanitizeAnswer(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/g, " ");
}

function isConcreteVisualCue(value: string) {
  const normalized = sanitizeAnswer(value);

  if (!normalized) {
    return false;
  }

  if (normalized.length < 2 || normalized.length > 60) {
    return false;
  }

  if (/[,:;]/.test(normalized)) {
    return false;
  }

  if (normalized.split(" ").length > 5) {
    return false;
  }

  return !ABSTRACT_LOCUS_WORDS.has(normalized);
}

export function validateMindPalaceTitle(title: string) {
  if (!title.trim()) {
    return "Нужно короткое название чертога.";
  }

  if (title.trim().length > 80) {
    return "Название чертога слишком длинное.";
  }

  return "";
}

export function validateMindPalaceLocus(locus: MindPalaceLocus) {
  if (!isConcreteVisualCue(locus.description)) {
    return "Точка должна быть конкретным визуальным образом, а не абстракцией.";
  }

  if (!isConcreteVisualCue(locus.cue)) {
    return "Опорный образ должен быть коротким и конкретным.";
  }

  if (locus.linked_images.length > 0) {
    return "Добавление информации недоступно, пока маршрут не стабилизирован.";
  }

  return "";
}

export function validateMindPalaceRoute(route: MindPalaceRoute) {
  if (route.loci.length < 5) {
    return "В маршруте должно быть минимум 5 точек.";
  }

  if (route.loci.length > 15) {
    return "В маршруте может быть максимум 15 точек.";
  }

  const seenPositions = new Set<number>();

  for (let index = 0; index < route.loci.length; index += 1) {
    const locus = route.loci[index];
    const expectedPosition = index + 1;

    if (locus.position !== expectedPosition) {
      return "Маршрут должен быть строго линейным, без пропусков и прыжков.";
    }

    if (seenPositions.has(locus.position)) {
      return "Порядок точек нарушен.";
    }

    seenPositions.add(locus.position);

    const locusError = validateMindPalaceLocus(locus);

    if (locusError) {
      return locusError;
    }
  }

  return "";
}

export function isMindPalaceStable(palace: MindPalace) {
  return (
    palace.verification.forward_passed &&
    palace.verification.backward_passed &&
    palace.verification.random_access_passed
  );
}

export function normalizeMindPalace(value: unknown, index = 0): MindPalace {
  const now = new Date().toISOString();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawLoci = Array.isArray((record.route as Record<string, unknown> | undefined)?.loci)
    ? (((record.route as Record<string, unknown>).loci as unknown[]) ?? [])
    : Array.isArray(record.loci)
      ? (record.loci as unknown[])
      : [];
  const route = {
    loci: rawLoci.map((item, locusIndex) => normalizeLocus(item, locusIndex)),
  };
  const verification = normalizeVerificationState(record.verification, now);
  const normalizedStatus = normalizeMindPalaceStatus(record.status);
  const normalizedStage = normalizeMindPalaceStage(record.stage);
  const routeError = route.loci.length > 0 ? validateMindPalaceRoute(route) : "";
  const stableByChecks =
    routeError === "" &&
    verification.forward_passed &&
    verification.backward_passed &&
    verification.random_access_passed;

  return {
    id: normalizeString(record.id) || createMindPalaceId(index),
    title: normalizeShortString(record.title, 80) || "Новый чертог",
    type: "memory_palace",
    status: normalizedStatus === "stable" && stableByChecks ? "stable" : "in_progress",
    stage:
      stableByChecks && normalizedStage === "ready_for_information"
        ? "ready_for_information"
        : route.loci.length === 0
          ? "creation"
          : routeError
            ? "creation"
            : stableByChecks
              ? "ready_for_information"
              : normalizedStage === "verification" ||
                  normalizedStage === "reinforcement" ||
                  normalizedStage === "fixation"
                ? normalizedStage
                : "fixation",
    route,
    verification,
    created_at: normalizeIsoDate(record.created_at, now),
    updated_at: normalizeIsoDate(record.updated_at, now),
  };
}

export function normalizeMindPalaces(value: unknown): MindPalace[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => normalizeMindPalace(item, index));
}

export function createMindPalace(input: { title: string }): MindPalace {
  const now = new Date().toISOString();

  return {
    id: createMindPalaceId(0),
    title: normalizeShortString(input.title, 80) || "Новый чертог",
    type: "memory_palace",
    status: "in_progress",
    stage: "creation",
    route: {
      loci: [],
    },
    verification: {
      forward_passed: false,
      backward_passed: false,
      random_access_passed: false,
      history: [],
    },
    created_at: now,
    updated_at: now,
  };
}

export function updateMindPalaceRoute(
  palace: MindPalace,
  loci: MindPalaceLocus[]
): { palace?: MindPalace; error?: string } {
  const route: MindPalaceRoute = {
    loci: loci.map((locus, index) => ({
      position: index + 1,
      description: normalizeShortString(locus.description, 60),
      cue: normalizeShortString(locus.cue, 60) || normalizeShortString(locus.description, 60),
      linked_images: [],
    })),
  };
  const error = validateMindPalaceRoute(route);

  if (error) {
    return { error };
  }

  return {
    palace: {
      ...palace,
      status: "in_progress",
      stage: "fixation",
      route,
      verification: {
        forward_passed: false,
        backward_passed: false,
        random_access_passed: false,
        history: [],
      },
      updated_at: new Date().toISOString(),
    },
  };
}

function buildForwardPrompt(anchor: MindPalaceLocus) {
  return `Что после ${anchor.cue}?`;
}

function buildBackwardPrompt(anchor: MindPalaceLocus) {
  return `Что перед ${anchor.cue}?`;
}

function buildRandomAccessPrompt(targetPosition: number) {
  return `Точка №${targetPosition}`;
}

export function runMindPalaceCheck(
  palace: MindPalace,
  input: MindPalaceCheckInput
): { palace?: MindPalace; error?: string } {
  const routeError = validateMindPalaceRoute(palace.route);

  if (routeError) {
    return { error: routeError };
  }

  const now = new Date().toISOString();
  let prompt = "";
  let expected = "";

  if (input.mode === "forward") {
    const anchor = palace.route.loci.find((locus) => locus.position === input.anchor_position);
    const next = palace.route.loci.find((locus) => locus.position === input.anchor_position + 1);

    if (!anchor || !next) {
      return { error: "Для прямой проверки нужна существующая непоследняя точка." };
    }

    prompt = buildForwardPrompt(anchor);
    expected = next.cue;
  } else if (input.mode === "backward") {
    const anchor = palace.route.loci.find((locus) => locus.position === input.anchor_position);
    const previous = palace.route.loci.find((locus) => locus.position === input.anchor_position - 1);

    if (!anchor || !previous) {
      return { error: "Для обратной проверки нужна существующая не первая точка." };
    }

    prompt = buildBackwardPrompt(anchor);
    expected = previous.cue;
  } else {
    const target = palace.route.loci.find((locus) => locus.position === input.target_position);

    if (!target) {
      return { error: "Нужна существующая точка маршрута." };
    }

    prompt = buildRandomAccessPrompt(input.target_position);
    expected = target.cue;
  }

  const success = sanitizeAnswer(input.answer) === sanitizeAnswer(expected);
  const record: MindPalaceCheckRecord = {
    mode: input.mode,
    prompt,
    expected_answer: expected,
    answer: normalizeShortString(input.answer, 60),
    success,
    checked_at: now,
  };

  if (!success) {
    return {
      palace: {
        ...palace,
        status: "in_progress",
        stage: "fixation",
        verification: {
          forward_passed: false,
          backward_passed: false,
          random_access_passed: false,
          history: [...palace.verification.history, record].slice(-20),
        },
        updated_at: now,
      },
    };
  }

  const verification: MindPalaceVerificationState = {
    forward_passed: input.mode === "forward" ? true : palace.verification.forward_passed,
    backward_passed: input.mode === "backward" ? true : palace.verification.backward_passed,
    random_access_passed:
      input.mode === "random_access" ? true : palace.verification.random_access_passed,
    history: [...palace.verification.history, record].slice(-20),
  };
  const stable = (
    verification.forward_passed &&
    verification.backward_passed &&
    verification.random_access_passed
  );

  return {
    palace: {
      ...palace,
      status: stable ? "stable" : "in_progress",
      stage: stable ? "ready_for_information" : "reinforcement",
      verification,
      updated_at: now,
    },
  };
}

export function canMindPalaceAcceptInformation(palace: MindPalace) {
  return palace.status === "stable" && palace.stage === "ready_for_information";
}
