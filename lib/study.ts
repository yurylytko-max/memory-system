import type { ReviewDirection, ReviewPairState, ReviewRating, ReviewState } from "@/lib/study-srs";

export type StudySceneType =
  | "dialogue"
  | "reading"
  | "forms"
  | "phonetics"
  | "culture"
  | "custom"
  | "mixed";

export type StudyContentType = "dialogue" | "reading";

export type StudyTaskType =
  | "single_choice"
  | "multiple_choice"
  | "matching"
  | "ordering"
  | "fill_in_blank"
  | "form_fill"
  | "guided_writing";

export type StudyTaskSkill = "recognition" | "guided_production" | "free_production";

export type GrammarPoint = {
  id: string;
  title: string;
  summary?: string;
  explanation: string;
  pattern?: string;
  examples: string[];
  pitfalls?: string[];
  notes?: string;
  linkedTaskIds?: string[];
};

export type VocabularyEntry = {
  id: string;
  de: string;
  ru: string;
  article?: string;
  lessonId: string;
  blockId?: string;
  sectionType: string;
  tags?: string[];
  cardModes: ReviewDirection[];
  notes?: string;
  review: ReviewPairState;
};

export type StudyDialogueLine = {
  speaker?: string;
  text: string;
};

export type StudyContentItem = {
  id: string;
  title: string;
  type: StudyContentType;
  text?: string;
  lines?: StudyDialogueLine[];
  translationRu?: string | StudyDialogueLine[];
  comprehensionFocus?: string[];
  notes?: string;
};

export type StudyTaskOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

export type StudyTaskField = {
  id: string;
  label: string;
  inputType: "text" | "number";
  acceptedAnswers?: string[];
  normalizedAcceptedAnswers?: string[];
};

export type StudyTask = {
  id: string;
  type: StudyTaskType;
  skill: StudyTaskSkill;
  instruction: string;
  prompt?: string;
  question?: string;
  explanation?: string;
  options?: StudyTaskOption[];
  acceptedAnswers?: string[];
  normalizedAcceptedAnswers?: string[];
  leftItems?: Array<{ id: string; text: string }>;
  rightItems?: Array<{ id: string; text: string }>;
  correctPairs?: Array<[string, string]>;
  tokens?: string[];
  correctOrder?: string[];
  fields?: StudyTaskField[];
  template?: string[];
  requiredPhrases?: string[];
  sampleAnswer?: string;
};

export type StudyBlock = {
  id: string;
  code: string;
  title: string;
  goal: string;
  sceneType: StudySceneType;
  intro?: string;
  corePhrases: string[];
  content: {
    dialogues: StudyContentItem[];
    readings: StudyContentItem[];
    explainer?: string;
  };
  grammarPoints: GrammarPoint[];
  vocabulary: string[];
  tasks: StudyTask[];
  notes?: string;
};

export type StudySummaryGrammar = {
  id: string;
  title: string;
  content: string;
};

export type StudySummaryCommunication = {
  id: string;
  title: string;
  phrases: string[];
};

export type StudyExtra = {
  id: string;
  type: "song" | "film" | "project" | "game" | "culture";
  title: string;
  content: {
    text?: string;
    items?: string[];
  };
  notes?: string;
};

export type StudyLesson = {
  id: string;
  order: number;
  title: string;
  topic?: string;
  notes?: string;
  lessonGlossary: VocabularyEntry[];
  blocks: StudyBlock[];
  summary: {
    grammar: StudySummaryGrammar[];
    communication: StudySummaryCommunication[];
    goals: string[];
  };
  extras: StudyExtra[];
};

export type StudyTextbook = {
  version: number;
  id: string;
  title: string;
  languageCode: string;
  baseLanguageCode?: string;
  level?: string;
  series?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lessons: StudyLesson[];
};

export type GlossaryCard = {
  textbookId: string;
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  entry: VocabularyEntry;
};

export type ReviewQueueCard = {
  textbookId: string;
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  direction: ReviewDirection;
  entry: VocabularyEntry;
  state: ReviewState;
};

export type LessonReviewStats = {
  totalDirections: number;
  dueDirections: number;
  learningDirections: number;
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeReview(raw: any): ReviewPairState {
  const now = new Date().toISOString();
  const initialState = {
    status: "new",
    dueAt: now,
    intervalDays: 0,
    easeFactor: 2.5,
    streak: 0,
    lapses: 0,
    lastReviewedAt: undefined,
    history: [],
  } satisfies ReviewState;

  return {
    de_to_ru: {
      ...initialState,
      ...(raw?.de_to_ru ?? {}),
      history: Array.isArray(raw?.de_to_ru?.history) ? raw.de_to_ru.history : [],
    },
    ru_to_de: {
      ...initialState,
      ...(raw?.ru_to_de ?? {}),
      history: Array.isArray(raw?.ru_to_de?.history) ? raw.ru_to_de.history : [],
    },
  };
}

function normalizeVocabularyEntry(
  raw: any,
  lessonId: string,
  fallbackBlockId?: string,
  fallbackSectionType = "glossary"
): VocabularyEntry {
  return {
    id: String(raw?.id ?? makeId()),
    de: String(raw?.de ?? raw?.term ?? "").trim(),
    ru: String(raw?.ru ?? raw?.translation ?? "").trim(),
    article: raw?.article ? String(raw.article).trim() : undefined,
    lessonId,
    blockId: raw?.blockId ? String(raw.blockId) : fallbackBlockId,
    sectionType: String(raw?.sectionType ?? raw?.section ?? fallbackSectionType),
    tags: normalizeStringArray(raw?.tags),
    cardModes:
      Array.isArray(raw?.cardModes) && raw.cardModes.length > 0
        ? raw.cardModes.filter((mode: string) => mode === "de_to_ru" || mode === "ru_to_de")
        : ["de_to_ru", "ru_to_de"],
    notes: raw?.notes ? String(raw.notes).trim() : undefined,
    review: normalizeReview(raw?.review),
  };
}

function normalizeContentItem(raw: any): StudyContentItem {
  const type: StudyContentType = raw?.type === "dialogue" ? "dialogue" : "reading";

  return {
    id: String(raw?.id ?? makeId()),
    title: String(raw?.title ?? "Материал").trim(),
    type,
    text: raw?.text ? String(raw.text) : undefined,
    lines: Array.isArray(raw?.lines)
      ? raw.lines
          .map((line: any) => ({
            speaker: line?.speaker ? String(line.speaker) : undefined,
            text: String(line?.text ?? "").trim(),
          }))
          .filter((line: StudyDialogueLine) => line.text)
      : undefined,
    translationRu: Array.isArray(raw?.translationRu)
      ? raw.translationRu
          .map((line: any) => ({
            speaker: line?.speaker ? String(line.speaker) : undefined,
            text: String(line?.text ?? "").trim(),
          }))
          .filter((line: StudyDialogueLine) => line.text)
      : raw?.translationRu
        ? String(raw.translationRu)
        : undefined,
    comprehensionFocus: normalizeStringArray(raw?.comprehensionFocus),
    notes: raw?.notes ? String(raw.notes).trim() : undefined,
  };
}

function normalizeGrammarPoint(raw: any): GrammarPoint {
  return {
    id: String(raw?.id ?? makeId()),
    title: String(raw?.title ?? "Грамматика").trim(),
    summary: raw?.summary ? String(raw.summary).trim() : undefined,
    explanation: String(raw?.explanation ?? raw?.content ?? "").trim(),
    pattern: raw?.pattern ? String(raw.pattern).trim() : undefined,
    examples: normalizeStringArray(raw?.examples),
    pitfalls: normalizeStringArray(raw?.pitfalls),
    notes: raw?.notes ? String(raw.notes).trim() : undefined,
    linkedTaskIds: normalizeStringArray(raw?.linkedTaskIds),
  };
}

function normalizeTask(raw: any): StudyTask {
  return {
    id: String(raw?.id ?? makeId()),
    type: String(raw?.type ?? "fill_in_blank") as StudyTaskType,
    skill: String(raw?.skill ?? "guided_production") as StudyTaskSkill,
    instruction: String(raw?.instruction ?? "").trim(),
    prompt: raw?.prompt ? String(raw.prompt).trim() : undefined,
    question: raw?.question ? String(raw.question).trim() : undefined,
    explanation: raw?.explanation ? String(raw.explanation).trim() : undefined,
    options: Array.isArray(raw?.options)
      ? raw.options.map((option: any) => ({
          id: String(option?.id ?? makeId()),
          text: String(option?.text ?? "").trim(),
          isCorrect: Boolean(option?.isCorrect),
        }))
      : undefined,
    acceptedAnswers: normalizeStringArray(raw?.acceptedAnswers),
    normalizedAcceptedAnswers: normalizeStringArray(raw?.normalizedAcceptedAnswers),
    leftItems: Array.isArray(raw?.leftItems)
      ? raw.leftItems.map((item: any) => ({
          id: String(item?.id ?? makeId()),
          text: String(item?.text ?? "").trim(),
        }))
      : undefined,
    rightItems: Array.isArray(raw?.rightItems)
      ? raw.rightItems.map((item: any) => ({
          id: String(item?.id ?? makeId()),
          text: String(item?.text ?? "").trim(),
        }))
      : undefined,
    correctPairs: Array.isArray(raw?.correctPairs)
      ? raw.correctPairs
          .map((pair: any) =>
            Array.isArray(pair) && pair.length === 2
              ? [String(pair[0]), String(pair[1])]
              : null
          )
          .filter(Boolean) as Array<[string, string]>
      : undefined,
    tokens: normalizeStringArray(raw?.tokens),
    correctOrder: normalizeStringArray(raw?.correctOrder),
    fields: Array.isArray(raw?.fields)
      ? raw.fields.map((field: any) => ({
          id: String(field?.id ?? makeId()),
          label: String(field?.label ?? "").trim(),
          inputType: field?.inputType === "number" ? "number" : "text",
          acceptedAnswers: normalizeStringArray(field?.acceptedAnswers),
          normalizedAcceptedAnswers: normalizeStringArray(field?.normalizedAcceptedAnswers),
        }))
      : undefined,
    template: normalizeStringArray(raw?.template),
    requiredPhrases: normalizeStringArray(raw?.requiredPhrases),
    sampleAnswer: raw?.sampleAnswer ? String(raw.sampleAnswer).trim() : undefined,
  };
}

function normalizeBlock(raw: any): StudyBlock {
  return {
    id: String(raw?.id ?? makeId()),
    code: String(raw?.code ?? "").trim() || "X",
    title: String(raw?.title ?? "Блок").trim(),
    goal: String(raw?.goal ?? "").trim(),
    sceneType: (raw?.sceneType as StudySceneType) ?? "mixed",
    intro: raw?.intro ? String(raw.intro).trim() : undefined,
    corePhrases: normalizeStringArray(raw?.corePhrases),
    content: {
      dialogues: Array.isArray(raw?.content?.dialogues)
        ? raw.content.dialogues.map(normalizeContentItem)
        : [],
      readings: Array.isArray(raw?.content?.readings)
        ? raw.content.readings.map(normalizeContentItem)
        : [],
      explainer: raw?.content?.explainer ? String(raw.content.explainer).trim() : undefined,
    },
    grammarPoints: Array.isArray(raw?.grammarPoints)
      ? raw.grammarPoints.map(normalizeGrammarPoint)
      : [],
    vocabulary: normalizeStringArray(raw?.vocabulary),
    tasks: Array.isArray(raw?.tasks) ? raw.tasks.map(normalizeTask) : [],
    notes: raw?.notes ? String(raw.notes).trim() : undefined,
  };
}

function normalizeLegacyLesson(raw: any, index: number): StudyLesson {
  const lessonId = String(raw?.id ?? makeId());
  const blockId = `legacy-${lessonId}`;
  const lessonGlossary = Array.isArray(raw?.vocabulary)
    ? raw.vocabulary.map((entry: any) =>
        normalizeVocabularyEntry(entry, lessonId, blockId, entry?.section ?? "legacy")
      )
    : [];

  const readings = Array.isArray(raw?.sections)
    ? raw.sections.map((section: any) =>
        normalizeContentItem({
          id: section?.id,
          title: section?.title,
          type: section?.type === "reading" ? "reading" : "reading",
          text: section?.content,
          notes: section?.notes,
        })
      )
    : [];

  return {
    id: lessonId,
    order: Number(raw?.order ?? index + 1),
    title: String(raw?.title ?? `Урок ${index + 1}`).trim(),
    topic: raw?.topic ? String(raw.topic).trim() : undefined,
    notes: raw?.notes ? String(raw.notes).trim() : undefined,
    lessonGlossary,
    blocks: [
      {
        id: blockId,
        code: "Overview",
        title: "Материалы урока",
        goal: "Сводный импорт из предыдущей версии структуры урока.",
        sceneType: "mixed",
        intro: "Урок был импортирован из старой схемы и собран в единый блок.",
        corePhrases: [],
        content: {
          dialogues: [],
          readings,
          explainer: undefined,
        },
        grammarPoints: Array.isArray(raw?.grammar) ? raw.grammar.map(normalizeGrammarPoint) : [],
        vocabulary: lessonGlossary.map((entry) => entry.id),
        tasks: [],
        notes: undefined,
      },
    ],
    summary: {
      grammar: [],
      communication: [],
      goals: [],
    },
    extras: [],
  };
}

function normalizeLesson(raw: any, index: number): StudyLesson {
  if (!Array.isArray(raw?.blocks)) {
    return normalizeLegacyLesson(raw, index);
  }

  const lessonId = String(raw?.id ?? makeId());
  const lessonGlossary = Array.isArray(raw?.lessonGlossary)
    ? raw.lessonGlossary.map((entry: any) => normalizeVocabularyEntry(entry, lessonId))
    : [];

  const blocks = raw.blocks.map(normalizeBlock);
  const blockIds = new Set(blocks.map((block) => block.id));

  const normalizedGlossary = lessonGlossary.map((entry) => ({
    ...entry,
    blockId: entry.blockId && blockIds.has(entry.blockId) ? entry.blockId : undefined,
  }));

  return {
    id: lessonId,
    order: Number(raw?.order ?? index + 1),
    title: String(raw?.title ?? `Урок ${index + 1}`).trim(),
    topic: raw?.topic ? String(raw.topic).trim() : undefined,
    notes: raw?.notes ? String(raw.notes).trim() : undefined,
    lessonGlossary: normalizedGlossary,
    blocks,
    summary: {
      grammar: Array.isArray(raw?.summary?.grammar)
        ? raw.summary.grammar.map((item: any) => ({
            id: String(item?.id ?? makeId()),
            title: String(item?.title ?? "").trim(),
            content: String(item?.content ?? "").trim(),
          }))
        : [],
      communication: Array.isArray(raw?.summary?.communication)
        ? raw.summary.communication.map((item: any) => ({
            id: String(item?.id ?? makeId()),
            title: String(item?.title ?? "").trim(),
            phrases: normalizeStringArray(item?.phrases),
          }))
        : [],
      goals: normalizeStringArray(raw?.summary?.goals),
    },
    extras: Array.isArray(raw?.extras)
      ? raw.extras.map((item: any) => ({
          id: String(item?.id ?? makeId()),
          type: item?.type ?? "culture",
          title: String(item?.title ?? "").trim(),
          content: {
            text: item?.content?.text ? String(item.content.text).trim() : undefined,
            items: normalizeStringArray(item?.content?.items),
          },
          notes: item?.notes ? String(item.notes).trim() : undefined,
        }))
      : [],
  };
}

export function normalizeStudyTextbook(raw: any): StudyTextbook {
  const source = raw?.textbook ? raw.textbook : raw;
  const now = new Date().toISOString();

  return {
    version: 2,
    id: String(source?.id ?? makeId()),
    title: String(source?.title ?? "Учебник").trim(),
    languageCode: String(source?.languageCode ?? "de").trim() || "de",
    baseLanguageCode: source?.baseLanguageCode
      ? String(source.baseLanguageCode).trim()
      : undefined,
    level: source?.level ? String(source.level).trim() : undefined,
    series: source?.series ? String(source.series).trim() : undefined,
    notes: source?.notes ? String(source.notes).trim() : undefined,
    createdAt: source?.createdAt ? String(source.createdAt) : now,
    updatedAt: source?.updatedAt ? String(source.updatedAt) : now,
    lessons: Array.isArray(source?.lessons)
      ? source.lessons.map((lesson: any, index: number) => normalizeLesson(lesson, index))
      : [],
  };
}

export function getLessonVocabulary(lesson: StudyLesson) {
  return lesson.lessonGlossary;
}

export function getBlockVocabulary(lesson: StudyLesson, blockId: string) {
  const block = lesson.blocks.find((item) => item.id === blockId);

  if (!block) {
    return [];
  }

  const vocabularyIds = new Set(block.vocabulary);
  return lesson.lessonGlossary.filter((entry) => vocabularyIds.has(entry.id));
}

export function flattenGlossary(textbook: StudyTextbook): GlossaryCard[] {
  return textbook.lessons.flatMap((lesson) =>
    lesson.lessonGlossary.map((entry) => ({
      textbookId: textbook.id,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonOrder: lesson.order,
      entry,
    }))
  );
}

export function countDueCards(textbook: StudyTextbook, now = new Date().toISOString()) {
  const timestamp = new Date(now).getTime();

  return flattenGlossary(textbook).reduce((count, card) => {
    return (
      count +
      (["de_to_ru", "ru_to_de"] as const).filter((direction) => {
        if (!card.entry.cardModes.includes(direction)) {
          return false;
        }

        return new Date(card.entry.review[direction].dueAt).getTime() <= timestamp;
      }).length
    );
  }, 0);
}

export function buildReviewQueue(
  textbook: StudyTextbook,
  mode: "learn" | "review" | "all",
  options?: {
    lessonId?: string;
    blockId?: string;
  },
  now = new Date().toISOString()
): ReviewQueueCard[] {
  const timestamp = new Date(now).getTime();
  const queue = flattenGlossary(textbook).flatMap((card) =>
    (["de_to_ru", "ru_to_de"] as const)
      .filter((direction) => card.entry.cardModes.includes(direction))
      .map((direction) => ({
        textbookId: textbook.id,
        lessonId: card.lessonId,
        lessonTitle: card.lessonTitle,
        lessonOrder: card.lessonOrder,
        direction,
        entry: card.entry,
        state: card.entry.review[direction],
      }))
  );

  return queue
    .filter((card) => {
      if (options?.lessonId && card.lessonId !== options.lessonId) {
        return false;
      }

      if (options?.blockId && card.entry.blockId !== options.blockId) {
        return false;
      }

      const due = new Date(card.state.dueAt).getTime() <= timestamp;

      if (mode === "all") {
        return true;
      }

      if (mode === "learn") {
        return card.state.status !== "review";
      }

      return due;
    })
    .sort((left, right) => {
      const dueDelta =
        new Date(left.state.dueAt).getTime() - new Date(right.state.dueAt).getTime();

      if (dueDelta !== 0) {
        return dueDelta;
      }

      return left.lessonOrder - right.lessonOrder;
    });
}

export function getLessonReviewStats(
  textbook: StudyTextbook,
  lessonId: string,
  now = new Date().toISOString()
): LessonReviewStats {
  const lessonQueue = buildReviewQueue(textbook, "all", { lessonId }, now);
  const nowTime = new Date(now).getTime();

  return {
    totalDirections: lessonQueue.length,
    dueDirections: lessonQueue.filter((card) => new Date(card.state.dueAt).getTime() <= nowTime).length,
    learningDirections: lessonQueue.filter((card) => card.state.status !== "review").length,
  };
}

export function formatVocabularyLabel(entry: VocabularyEntry) {
  return entry.article ? `${entry.article} ${entry.de}` : entry.de;
}

export async function getAllStudyTextbooks(): Promise<StudyTextbook[]> {
  const response = await fetch("/api/study", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load study textbooks");
  }

  const textbooks = await response.json();
  return Array.isArray(textbooks) ? textbooks.map(normalizeStudyTextbook) : [];
}

export async function getStudyTextbook(id: string): Promise<StudyTextbook | undefined> {
  const response = await fetch(`/api/study/${id}`, { cache: "no-store" });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error("Failed to load study textbook");
  }

  return normalizeStudyTextbook(await response.json());
}

export async function createStudyTextbook(textbook: StudyTextbook) {
  const response = await fetch("/api/study", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(textbook),
  });

  if (!response.ok) {
    throw new Error("Failed to create study textbook");
  }
}

export async function updateStudyTextbook(textbook: StudyTextbook) {
  const response = await fetch(`/api/study/${textbook.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(textbook),
  });

  if (!response.ok) {
    throw new Error("Failed to update study textbook");
  }
}

export async function deleteStudyTextbook(id: string) {
  const response = await fetch(`/api/study/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete study textbook");
  }
}

export async function importStudyTextbook(input: unknown): Promise<StudyTextbook> {
  const response = await fetch("/api/study/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to import study textbook");
  }

  return normalizeStudyTextbook(await response.json());
}

export type SubmitReviewArgs = {
  textbook: StudyTextbook;
  lessonId: string;
  entryId: string;
  direction: ReviewDirection;
  rating: ReviewRating;
};
