export type VocabularySourceType = "study-3";

export type VocabularyStatus = "new" | "learning" | "review";

export type VocabularyReviewRating = "again" | "hard" | "good" | "easy";

export type VocabularyMnemonicStatus = "none" | "in_progress" | "anchored";

export type VocabularyMnemonicMode =
  | "sound"
  | "image"
  | "linked_word"
  | "chain"
  | "nested";

export type VocabularyMnemonicSound = {
  kind: "sound";
  sound_anchor?: string;
  image_anchor?: string;
};

export type VocabularyMnemonicImage = {
  kind: "image";
  action?: string;
  interaction?: string;
};

export type VocabularyMnemonicLinkedWord = {
  kind: "linked_word";
  target_card_id?: string;
  relation?: string;
};

export type VocabularyMnemonicChainElement = {
  id: string;
  label: string;
  card_id?: string;
};

export type VocabularyMnemonicChainLink = {
  from_id: string;
  to_id: string;
  relation: string;
};

export type VocabularyMnemonicChain = {
  kind: "chain";
  elements: VocabularyMnemonicChainElement[];
  links: VocabularyMnemonicChainLink[];
};

export type VocabularyMnemonicNestedNode = {
  id: string;
  label: string;
  placement?: string;
  children: VocabularyMnemonicNestedNode[];
};

export type VocabularyMnemonicNested = {
  kind: "nested";
  base?: VocabularyMnemonicNestedNode;
};

export type VocabularyMnemonic =
  | VocabularyMnemonicSound
  | VocabularyMnemonicImage
  | VocabularyMnemonicLinkedWord
  | VocabularyMnemonicChain
  | VocabularyMnemonicNested;

export type VocabularyMnemonicVerification = {
  direction: "cue_to_word" | "word_to_cue";
  prompt: string;
  answer: string;
  success: boolean;
  checked_at: string;
};

export type VocabularyMnemonicRecommendation = {
  recommended: boolean;
  reason: "manual" | "error" | "unstable" | null;
};

export type VocabularyItem = {
  id: string;
  text: string;
  translation: string;
  context?: string;
  source_lesson?: string;
  source_page?: number;
  source_type: VocabularySourceType;
  source_book_id?: string;
  source_book_title?: string;
  collection: "study-3-dictionary";
  status: VocabularyStatus;
  learning_step: number;
  repetitions: number;
  correct: number;
  wrong: number;
  correct_count: number;
  wrong_count: number;
  interval: number;
  ease: number;
  next_review: string;
  last_reviewed_at?: string;
  recent_ratings: VocabularyReviewRating[];
  mnemonic_status: VocabularyMnemonicStatus;
  mnemonic_mode?: VocabularyMnemonicMode;
  mnemonic?: VocabularyMnemonic;
  mnemonic_verification?: VocabularyMnemonicVerification;
  mnemonic_worked_last_time?: boolean;
  created_at: string;
  updated_at: string;
};

export type VocabularyReviewQueue = {
  now: string;
  newItems: VocabularyItem[];
  dueItems: VocabularyItem[];
  queue: VocabularyItem[];
};

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

function createVocabularyId(index: number) {
  return `word-${Date.now()}-${index}`;
}

function createMnemonicNodeId(index: number) {
  return `mnemonic-node-${Date.now()}-${index}`;
}

function normalizeStatus(value: unknown): VocabularyStatus {
  return value === "learning" || value === "review" ? value : "new";
}

function normalizeSourceType(value: unknown): VocabularySourceType {
  return value === "study-3" ? value : "study-3";
}

function normalizeCollection(value: unknown): VocabularyItem["collection"] {
  return value === "study-3-dictionary" ? value : "study-3-dictionary";
}

function normalizeMnemonicStatus(value: unknown): VocabularyMnemonicStatus {
  return value === "in_progress" || value === "anchored" ? value : "none";
}

export function isVocabularyReviewRating(value: unknown): value is VocabularyReviewRating {
  return value === "again" || value === "hard" || value === "good" || value === "easy";
}

export function isVocabularyMnemonicMode(value: unknown): value is VocabularyMnemonicMode {
  return (
    value === "sound" ||
    value === "image" ||
    value === "linked_word" ||
    value === "chain" ||
    value === "nested"
  );
}

export function buildVocabularyKey(item: Pick<VocabularyItem, "text" | "translation">) {
  return `${item.text.trim().toLocaleLowerCase("de-DE")}::${item.translation
    .trim()
    .toLocaleLowerCase("ru-RU")}`;
}

function normalizeRecentRatings(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as VocabularyReviewRating[];
  }

  return value
    .filter(isVocabularyReviewRating)
    .slice(-5);
}

function normalizeMnemonicChainElement(
  value: unknown,
  index: number
): VocabularyMnemonicChainElement | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = normalizeShortString(record.label, 60);

  if (!label) {
    return null;
  }

  return {
    id: normalizeString(record.id) || createMnemonicNodeId(index),
    label,
    card_id: normalizeString(record.card_id) || undefined,
  };
}

function normalizeMnemonicChainLink(value: unknown): VocabularyMnemonicChainLink | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fromId = normalizeString(record.from_id);
  const toId = normalizeString(record.to_id);
  const relation = normalizeShortString(record.relation, 80);

  if (!fromId || !toId || !relation) {
    return null;
  }

  return {
    from_id: fromId,
    to_id: toId,
    relation,
  };
}

function normalizeMnemonicNestedNode(
  value: unknown,
  depth = 1,
  indexSeed = 0
): VocabularyMnemonicNestedNode | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = normalizeShortString(record.label, 60);

  if (!label) {
    return null;
  }

  const rawChildren = Array.isArray(record.children) ? record.children : [];

  return {
    id: normalizeString(record.id) || createMnemonicNodeId(indexSeed + depth),
    label,
    placement: normalizeShortString(record.placement, 40) || undefined,
    children: rawChildren
      .map((child, index) => normalizeMnemonicNestedNode(child, depth + 1, indexSeed + index + 1))
      .filter((child): child is VocabularyMnemonicNestedNode => child !== null),
  };
}

export function normalizeVocabularyMnemonic(
  value: unknown,
  mode?: VocabularyMnemonicMode
): VocabularyMnemonic | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const kind = isVocabularyMnemonicMode(record.kind) ? record.kind : mode;

  if (!kind) {
    return undefined;
  }

  if (kind === "sound") {
    return {
      kind,
      sound_anchor: normalizeShortString(record.sound_anchor, 60) || undefined,
      image_anchor: normalizeShortString(record.image_anchor, 80) || undefined,
    };
  }

  if (kind === "image") {
    return {
      kind,
      action: normalizeShortString(record.action, 60) || undefined,
      interaction: normalizeShortString(record.interaction, 80) || undefined,
    };
  }

  if (kind === "linked_word") {
    return {
      kind,
      target_card_id: normalizeString(record.target_card_id) || undefined,
      relation: normalizeShortString(record.relation, 80) || undefined,
    };
  }

  if (kind === "chain") {
    const elements = Array.isArray(record.elements)
      ? record.elements
          .map((element, index) => normalizeMnemonicChainElement(element, index))
          .filter((element): element is VocabularyMnemonicChainElement => element !== null)
      : [];
    const links = Array.isArray(record.links)
      ? record.links
          .map(normalizeMnemonicChainLink)
          .filter((link): link is VocabularyMnemonicChainLink => link !== null)
      : [];

    return {
      kind,
      elements,
      links,
    };
  }

  return {
    kind,
    base: normalizeMnemonicNestedNode(record.base),
  };
}

function normalizeMnemonicVerification(value: unknown, fallbackNow: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const direction =
    record.direction === "word_to_cue" ? "word_to_cue" : "cue_to_word";
  const prompt = normalizeShortString(record.prompt, 120);
  const answer = normalizeShortString(record.answer, 120);

  if (!prompt || !answer) {
    return undefined;
  }

  return {
    direction,
    prompt,
    answer,
    success: Boolean(record.success),
    checked_at: normalizeIsoDate(record.checked_at, fallbackNow),
  } satisfies VocabularyMnemonicVerification;
}

export function normalizeVocabularyItem(
  item: Partial<VocabularyItem>,
  index = 0
): VocabularyItem {
  const now = new Date().toISOString();
  const text = normalizeString(item.text);
  const translation = normalizeString(item.translation);
  const mnemonicStatus = normalizeMnemonicStatus(item.mnemonic_status);
  const mnemonicMode = isVocabularyMnemonicMode(item.mnemonic_mode)
    ? item.mnemonic_mode
    : undefined;
  const mnemonic = normalizeVocabularyMnemonic(item.mnemonic, mnemonicMode);

  return {
    id: normalizeString(item.id) || createVocabularyId(index),
    text,
    translation,
    context: normalizeShortString(item.context, 200) || undefined,
    source_lesson: normalizeString(item.source_lesson) || undefined,
    source_page: Math.max(1, Number(item.source_page) || 0) || undefined,
    source_type: normalizeSourceType(item.source_type),
    source_book_id: normalizeString(item.source_book_id) || undefined,
    source_book_title: normalizeString(item.source_book_title) || undefined,
    collection: normalizeCollection(item.collection),
    status: normalizeStatus(item.status),
    learning_step: Math.max(0, Number(item.learning_step) || 0),
    repetitions: Math.max(
      0,
      Number(item.repetitions ?? item.correct_count ?? item.correct) || 0
    ),
    correct: Math.max(0, Number(item.correct) || 0),
    wrong: Math.max(0, Number(item.wrong) || 0),
    correct_count: Math.max(0, Number(item.correct_count ?? item.correct) || 0),
    wrong_count: Math.max(0, Number(item.wrong_count ?? item.wrong) || 0),
    interval: Math.max(1, Number(item.interval) || 1),
    ease: Math.max(1.3, Number(item.ease) || 2.5),
    next_review: normalizeIsoDate(item.next_review, now),
    last_reviewed_at: normalizeString(item.last_reviewed_at)
      ? normalizeIsoDate(item.last_reviewed_at, now)
      : undefined,
    recent_ratings: normalizeRecentRatings(item.recent_ratings),
    mnemonic_status: mnemonic ? mnemonicStatus : "none",
    mnemonic_mode: mnemonic ? mnemonic.kind : undefined,
    mnemonic,
    mnemonic_verification: normalizeMnemonicVerification(item.mnemonic_verification, now),
    mnemonic_worked_last_time:
      typeof item.mnemonic_worked_last_time === "boolean"
        ? item.mnemonic_worked_last_time
        : undefined,
    created_at: normalizeIsoDate(item.created_at, now),
    updated_at: normalizeIsoDate(item.updated_at, now),
  };
}

export function normalizeVocabulary(items: unknown): VocabularyItem[] {
  const source = Array.isArray(items) ? items : [];
  const seen = new Set<string>();

  return source
    .map((item, index) => normalizeVocabularyItem(item as Partial<VocabularyItem>, index))
    .filter((item) => {
      if (item.text.length === 0 || item.translation.length === 0) {
        return false;
      }

      const key = buildVocabularyKey(item);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((left, right) => left.next_review.localeCompare(right.next_review));
}

export function filterStudyThreeVocabulary(items: VocabularyItem[]) {
  return items.filter(
    (item) => item.source_type === "study-3" && item.collection === "study-3-dictionary"
  );
}

export function buildVocabularyReviewQueue(
  items: VocabularyItem[],
  now = new Date()
): VocabularyReviewQueue {
  const nowIso = now.toISOString();
  const studyItems = filterStudyThreeVocabulary(items);
  const newItems = studyItems
    .filter((item) => item.status === "new")
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
  const dueItems = studyItems
    .filter((item) => item.status !== "new" && item.next_review <= nowIso)
    .sort((left, right) => left.next_review.localeCompare(right.next_review));

  return {
    now: nowIso,
    newItems,
    dueItems,
    queue: [...newItems, ...dueItems],
  };
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next.toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function appendRecentRating(
  current: VocabularyReviewRating[],
  rating: VocabularyReviewRating
) {
  return [...current, rating].slice(-5);
}

export function isVocabularyUnstable(item: Pick<VocabularyItem, "recent_ratings">) {
  const recent = item.recent_ratings.slice(-3);

  if (recent.length < 2) {
    return false;
  }

  const hardOrAgain = recent.filter((rating) => rating === "hard" || rating === "again").length;
  const success = recent.filter((rating) => rating === "good" || rating === "easy").length;

  return hardOrAgain > 0 && success > 0;
}

export function getVocabularyMnemonicRecommendation(
  item: VocabularyItem,
  reason: "manual" | "review",
  rating?: VocabularyReviewRating
): VocabularyMnemonicRecommendation {
  if (reason === "manual") {
    return { recommended: true, reason: "manual" };
  }

  if (rating === "again") {
    return { recommended: item.mnemonic_status !== "anchored", reason: "error" };
  }

  if (rating === "hard" && isVocabularyUnstable(item)) {
    return { recommended: item.mnemonic_status !== "anchored", reason: "unstable" };
  }

  if (rating && isVocabularyUnstable(item)) {
    return { recommended: item.mnemonic_status !== "anchored", reason: "unstable" };
  }

  return { recommended: false, reason: null };
}

export function getVocabularyMnemonicCue(item: VocabularyItem) {
  const mnemonic = item.mnemonic;

  if (!mnemonic) {
    return "";
  }

  if (mnemonic.kind === "sound") {
    return mnemonic.image_anchor || mnemonic.sound_anchor || "";
  }

  if (mnemonic.kind === "image") {
    return [mnemonic.action, mnemonic.interaction].filter(Boolean).join(" -> ");
  }

  if (mnemonic.kind === "linked_word") {
    return mnemonic.relation || "";
  }

  if (mnemonic.kind === "chain") {
    return mnemonic.elements.map((element) => element.label).join(" -> ");
  }

  return mnemonic.base?.label ?? "";
}

export function createVocabularyVerification(
  item: VocabularyItem,
  success: boolean,
  now = new Date()
): VocabularyMnemonicVerification | undefined {
  const cue = getVocabularyMnemonicCue(item);

  if (!cue) {
    return undefined;
  }

  return {
    direction: "cue_to_word",
    prompt: cue,
    answer: item.text,
    success,
    checked_at: now.toISOString(),
  };
}

function getNestedDepth(node?: VocabularyMnemonicNestedNode): number {
  if (!node) {
    return 0;
  }

  if (node.children.length === 0) {
    return 1;
  }

  return 1 + Math.max(...node.children.map((child) => getNestedDepth(child)));
}

export function validateVocabularyMnemonic(
  item: VocabularyItem,
  allItems: VocabularyItem[]
): string | null {
  if (item.mnemonic_status === "none") {
    return null;
  }

  if (!item.mnemonic_mode || !item.mnemonic) {
    return "Не выбран тип мнемотехники.";
  }

  const strict = item.mnemonic_status === "anchored";

  if (item.mnemonic_mode === "sound") {
    const mnemonic = item.mnemonic as VocabularyMnemonicSound;

    if (strict && (!mnemonic.sound_anchor || !mnemonic.image_anchor)) {
      return "Для звуковой мнемотехники нужен якорь и короткий образ.";
    }

    return null;
  }

  if (item.mnemonic_mode === "image") {
    const mnemonic = item.mnemonic as VocabularyMnemonicImage;

    if (strict && (!mnemonic.action || !mnemonic.interaction)) {
      return "Для образа нужна одна короткая сцена.";
    }

    return null;
  }

  if (item.mnemonic_mode === "linked_word") {
    const mnemonic = item.mnemonic as VocabularyMnemonicLinkedWord;

    if (!mnemonic.target_card_id) {
      return "Нужно выбрать существующее слово.";
    }

    if (mnemonic.target_card_id === item.id) {
      return "Нужно выбрать другое слово.";
    }

    if (!allItems.some((entry) => entry.id === mnemonic.target_card_id)) {
      return "Связанное слово не найдено.";
    }

    if (strict && !mnemonic.relation) {
      return "Нужно описать связь между словами.";
    }

    return null;
  }

  if (item.mnemonic_mode === "chain") {
    const mnemonic = item.mnemonic as VocabularyMnemonicChain;
    const elementCount = mnemonic.elements.length;

    if (elementCount > 5) {
      return "В цепочке может быть максимум 5 элементов.";
    }

    if (strict && elementCount < 2) {
      return "В цепочке должно быть минимум 2 элемента.";
    }

    if (strict && mnemonic.links.length !== Math.max(0, elementCount - 1)) {
      return "Для цепочки нужны связи между соседними элементами.";
    }

    return null;
  }

  const mnemonic = item.mnemonic as VocabularyMnemonicNested;
  const depth = getNestedDepth(mnemonic.base);

  if (depth > 3) {
    return "Во вложении может быть максимум 3 уровня.";
  }

  if (strict && depth < 2) {
    return "Для вложения нужен базовый объект и минимум один элемент.";
  }

  return null;
}

export function resetVocabularyMnemonic(item: VocabularyItem, now = new Date()) {
  return normalizeVocabularyItem(
    {
      ...item,
      mnemonic_status: "none",
      mnemonic_mode: undefined,
      mnemonic: undefined,
      mnemonic_verification: undefined,
      mnemonic_worked_last_time: undefined,
      updated_at: now.toISOString(),
    },
    0
  );
}

function cleanupVocabularyMnemonicAfterCardDeletion(
  item: VocabularyItem,
  deletedId: string,
  now = new Date()
) {
  if (!item.mnemonic || !item.mnemonic_mode) {
    return item;
  }

  if (item.mnemonic_mode === "linked_word" && item.mnemonic.kind === "linked_word") {
    if (item.mnemonic.target_card_id !== deletedId) {
      return item;
    }

    return resetVocabularyMnemonic(item, now);
  }

  if (item.mnemonic_mode === "chain" && item.mnemonic.kind === "chain") {
    const nextElements = item.mnemonic.elements.filter((element) => element.card_id !== deletedId);

    if (nextElements.length === item.mnemonic.elements.length) {
      return item;
    }

    if (nextElements.length === 0) {
      return resetVocabularyMnemonic(item, now);
    }

    const allowedElementIds = new Set(nextElements.map((element) => element.id));
    const nextLinks = item.mnemonic.links.filter(
      (link) => allowedElementIds.has(link.from_id) && allowedElementIds.has(link.to_id)
    );

    return normalizeVocabularyItem(
      {
        ...item,
        mnemonic_status: "in_progress",
        mnemonic_mode: "chain",
        mnemonic: {
          kind: "chain",
          elements: nextElements,
          links: nextLinks,
        },
        mnemonic_verification: undefined,
        mnemonic_worked_last_time: undefined,
        updated_at: now.toISOString(),
      },
      0
    );
  }

  return item;
}

export function removeVocabularyItemAndCleanup(
  items: VocabularyItem[],
  deletedId: string,
  now = new Date()
) {
  const remaining = items.filter((item) => item.id !== deletedId);

  return remaining.map((item) =>
    cleanupVocabularyMnemonicAfterCardDeletion(item, deletedId, now)
  );
}

export function applyVocabularyMnemonicUpdate(
  item: VocabularyItem,
  update: {
    mnemonic_status?: VocabularyMnemonicStatus;
    mnemonic_mode?: VocabularyMnemonicMode;
    mnemonic?: VocabularyMnemonic | undefined;
    mnemonic_verification?: VocabularyMnemonicVerification | undefined;
    mnemonic_worked_last_time?: boolean | undefined;
  },
  now = new Date()
) {
  const mnemonicStatus = normalizeMnemonicStatus(update.mnemonic_status ?? item.mnemonic_status);
  const mnemonicMode = update.mnemonic_mode ?? item.mnemonic_mode;
  const mnemonic = update.mnemonic ?? item.mnemonic;

  return normalizeVocabularyItem(
    {
      ...item,
      mnemonic_status: mnemonicStatus,
      mnemonic_mode: mnemonicMode,
      mnemonic,
      mnemonic_verification: update.mnemonic_verification ?? item.mnemonic_verification,
      mnemonic_worked_last_time:
        update.mnemonic_worked_last_time ?? item.mnemonic_worked_last_time,
      updated_at: now.toISOString(),
    },
    0
  );
}

export function applyVocabularyReview(
  item: VocabularyItem,
  rating: VocabularyReviewRating,
  now = new Date()
): VocabularyItem {
  const updatedAt = now.toISOString();
  const isCorrect = rating !== "again";
  const nextRecentRatings = appendRecentRating(item.recent_ratings, rating);

  if (item.status === "new") {
    if (rating === "again") {
      return {
        ...item,
        status: "learning",
        learning_step: 0,
        repetitions: 0,
        wrong: item.wrong + 1,
        wrong_count: item.wrong_count + 1,
        ease: Math.max(1.3, item.ease - 0.2),
        next_review: addMinutes(now, 5),
        last_reviewed_at: updatedAt,
        recent_ratings: nextRecentRatings,
        updated_at: updatedAt,
      };
    }

    if (rating === "hard") {
      return {
        ...item,
        status: "learning",
        learning_step: 1,
        repetitions: 0,
        correct: item.correct + 1,
        correct_count: item.correct_count + 1,
        ease: Math.max(1.3, item.ease - 0.05),
        next_review: addMinutes(now, 10),
        last_reviewed_at: updatedAt,
        recent_ratings: nextRecentRatings,
        updated_at: updatedAt,
      };
    }

    const interval = rating === "easy" ? 3 : 1;

    return {
      ...item,
      status: "review",
      learning_step: 2,
      repetitions: 1,
      interval,
      ease: rating === "easy" ? Math.min(3.2, item.ease + 0.15) : item.ease,
      correct: item.correct + 1,
      correct_count: item.correct_count + 1,
      next_review: addDays(now, interval),
      last_reviewed_at: updatedAt,
      recent_ratings: nextRecentRatings,
      updated_at: updatedAt,
    };
  }

  if (rating === "again") {
    return {
      ...item,
      status: "learning",
      learning_step: 0,
      repetitions: 0,
      interval: 1,
      ease: Math.max(1.3, item.ease - 0.2),
      wrong: item.wrong + 1,
      wrong_count: item.wrong_count + 1,
      next_review: addMinutes(now, 10),
      last_reviewed_at: updatedAt,
      recent_ratings: nextRecentRatings,
      updated_at: updatedAt,
    };
  }

  const nextRepetitions = item.repetitions + (isCorrect ? 1 : 0);
  const baseInterval =
    item.repetitions <= 1 ? item.interval : Math.max(1, Math.round(item.interval * item.ease));
  const nextInterval =
    rating === "hard"
      ? Math.max(1, Math.round(Math.max(1, item.interval) * 1.2))
      : rating === "easy"
        ? Math.max(baseInterval + 1, Math.round(baseInterval * (item.ease + 0.25)))
        : Math.max(1, baseInterval);
  const nextEase =
    rating === "hard"
      ? Math.max(1.3, item.ease - 0.15)
      : rating === "easy"
        ? Math.min(3.2, item.ease + 0.15)
        : item.ease;

  return {
    ...item,
    status: "review",
    learning_step: Math.max(2, item.learning_step),
    repetitions: nextRepetitions,
    interval: nextInterval,
    ease: nextEase,
    correct: item.correct + 1,
    correct_count: item.correct_count + 1,
    next_review: addDays(now, nextInterval),
    last_reviewed_at: updatedAt,
    recent_ratings: nextRecentRatings,
    updated_at: updatedAt,
  };
}
