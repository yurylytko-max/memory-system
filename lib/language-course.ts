export type ImportedPage = {
  pageNumber: number;
  text: string;
};

export type LessonExercise = {
  id: string;
  prompt: string;
  answer: string;
  sourceSentence: string;
};

export type LessonGlossaryCard = {
  id: string;
  term: string;
  context: string;
};

export type CourseLesson = {
  id: string;
  index: number;
  title: string;
  pageStart: number;
  pageEnd: number;
  content: string;
  exercises: LessonExercise[];
  glossary: LessonGlossaryCard[];
};

export type ImportedCourse = {
  id: string;
  parserVersion: number;
  sourceFileName: string;
  importedAt: string;
  totalPages: number;
  lessons: CourseLesson[];
};

export type LessonProgress = {
  answers: Record<string, string>;
  flippedGlossaryIds: string[];
};

const LANGUAGE_COURSE_STORAGE_KEY = "language_course_db";
const LANGUAGE_PROGRESS_STORAGE_KEY = "language_course_progress_db";
const LANGUAGE_COURSE_PARSER_VERSION = 2;

const LESSON_DEFINITIONS = [
  {
    index: 1,
    title: "Guten Tag. Mein Name ist...",
    keywords: ["guten", "tag", "name", "ist"],
  },
  {
    index: 2,
    title: "Meine Familie",
    keywords: ["familie"],
  },
  {
    index: 3,
    title: "Einkaufen",
    keywords: ["einkaufen"],
  },
  {
    index: 4,
    title: "Meine Wohnung",
    keywords: ["wohnung"],
  },
  {
    index: 5,
    title: "Mein Tag",
    keywords: ["mein", "tag"],
  },
  {
    index: 6,
    title: "Freizeit",
    keywords: ["freizeit"],
  },
  {
    index: 7,
    title: "Kinder und Schule",
    keywords: ["kinder", "schule"],
  },
] as const;

const GERMAN_STOPWORDS = new Set([
  "aber",
  "alle",
  "alles",
  "als",
  "also",
  "am",
  "an",
  "auch",
  "auf",
  "aus",
  "bei",
  "bin",
  "bist",
  "bitte",
  "das",
  "dass",
  "dein",
  "deine",
  "dem",
  "den",
  "der",
  "des",
  "die",
  "doch",
  "du",
  "ein",
  "eine",
  "einen",
  "einer",
  "einem",
  "eines",
  "er",
  "es",
  "für",
  "freut",
  "gut",
  "haben",
  "hast",
  "hat",
  "heiße",
  "heißen",
  "heißt",
  "hier",
  "ich",
  "ihr",
  "ihre",
  "im",
  "in",
  "ist",
  "ja",
  "kein",
  "keine",
  "kommen",
  "kommst",
  "kommt",
  "mein",
  "meine",
  "mit",
  "nicht",
  "noch",
  "nur",
  "oder",
  "sie",
  "sind",
  "spreche",
  "sprechen",
  "sprichst",
  "und",
  "von",
  "was",
  "wer",
  "wie",
  "wir",
  "wo",
  "woher",
]);

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactForSearch(text: string) {
  return normalizeForMatch(text).replace(/\s+/g, "");
}

function getTopOfPage(text: string, lines = 8) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, lines)
    .join(" ");
}

function isMostlyNoiseLine(line: string) {
  const normalized = line.trim();

  if (!normalized) {
    return true;
  }

  if (/^[\d\s()[\]{}<>/*+.,:;=_%|-]+$/.test(normalized)) {
    return true;
  }

  const tokens = normalized.split(/\s+/);
  const singleLetterTokens = tokens.filter((token) =>
    /^[A-Za-zÄÖÜäöüß]$/.test(token)
  ).length;

  if (tokens.length >= 6 && singleLetterTokens / tokens.length > 0.45) {
    return true;
  }

  const letters = normalized.match(/[A-Za-zÄÖÜäöüß]/g)?.length ?? 0;

  if (letters < 3) {
    return true;
  }

  return false;
}

function cleanLessonContent(text: string) {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t]+/g, " ")
        .replace(/^[A-Z]?\s*[*>()[\]/\\-]*\s*\d+(?:\s*-\s*\d+)*\s*/g, "")
        .replace(/^[A-E]\d?\s+/g, "")
        .replace(/^Folge\s+\d+:?\s*/i, "")
        .trim()
    )
    .filter((line) => !isMostlyNoiseLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ ?• ?/g, "\n• ")
    .trim();
}

function extractSentences(text: string) {
  return cleanLessonContent(text)
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);
}

function sanitizeWord(word: string) {
  return word
    .toLowerCase()
    .replace(/^[^a-zA-ZÄÖÜäöüß]+|[^a-zA-ZÄÖÜäöüß]+$/g, "");
}

function pickAnswerWord(sentence: string) {
  const words = sentence
    .split(/\s+/)
    .map((word) => sanitizeWord(word))
    .filter((word) => word.length > 3 && !GERMAN_STOPWORDS.has(word));

  return words.sort((left, right) => right.length - left.length)[0] ?? null;
}

function generateExercises(text: string, lessonIndex: number) {
  const sentences = extractSentences(text);
  const exercises: LessonExercise[] = [];

  for (const sentence of sentences) {
    if (exercises.length >= 6) {
      break;
    }

    const answer = pickAnswerWord(sentence);

    if (!answer) {
      continue;
    }

    const pattern = new RegExp(`\\b${answer}\\b`, "i");

    if (!pattern.test(sentence)) {
      continue;
    }

    exercises.push({
      id: `lesson-${lessonIndex}-exercise-${exercises.length + 1}`,
      prompt: sentence.replace(pattern, "_____"),
      answer,
      sourceSentence: sentence,
    });
  }

  return exercises;
}

function generateGlossary(text: string, lessonIndex: number) {
  const sentences = extractSentences(text);
  const counts = new Map<string, number>();

  for (const sentence of sentences) {
    for (const rawWord of sentence.split(/\s+/)) {
      const word = sanitizeWord(rawWord);

      if (word.length < 4 || GERMAN_STOPWORDS.has(word)) {
        continue;
      }

      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, 12)
    .map(([term], index) => {
      const context =
        sentences.find((sentence) =>
          new RegExp(`\\b${term}\\b`, "i").test(sentence)
        ) ?? term;

      return {
        id: `lesson-${lessonIndex}-glossary-${index + 1}`,
        term,
        context,
      };
    });
}

function detectLessonStartPages(pages: ImportedPage[]) {
  const lessonRegionStart =
    pages.find((page) =>
      page.pageNumber >= 12 &&
      normalizeForMatch(page.text).includes("die erste stunde im kurs")
    )?.pageNumber ?? 12;

  let searchFromPage = lessonRegionStart;

  return LESSON_DEFINITIONS.map((definition) => {
    const startPage = pages.find((page) => {
      if (page.pageNumber < searchFromPage) {
        return false;
      }

      const topCompact = compactForSearch(getTopOfPage(page.text, 3));

      return definition.keywords.every((keyword) =>
        topCompact.includes(compactForSearch(keyword))
      );
    });

    if (!startPage) {
      return null;
    }

    searchFromPage = startPage.pageNumber + 1;

    return {
      index: definition.index,
      title: definition.title,
      pageNumber: startPage.pageNumber,
    };
  }).filter(Boolean) as Array<{
    index: number;
    title: string;
    pageNumber: number;
  }>;
}

export function parseImportedCourse(
  pages: ImportedPage[],
  sourceFileName: string
): ImportedCourse {
  const starts = detectLessonStartPages(pages);

  const lessons = starts.map((start, index) => {
    const nextStart = starts[index + 1];
    const pageSlice = pages.filter((page) => {
      if (page.pageNumber < start.pageNumber) {
        return false;
      }

      if (!nextStart) {
        return true;
      }

      return page.pageNumber < nextStart.pageNumber;
    });

    const content = cleanLessonContent(
      pageSlice.map((page) => page.text).join("\n\n")
    );

    return {
      id: `lesson-${start.index}`,
      index: start.index,
      title: start.title,
      pageStart: start.pageNumber,
      pageEnd: pageSlice.at(-1)?.pageNumber ?? start.pageNumber,
      content,
      exercises: generateExercises(content, start.index),
      glossary: generateGlossary(content, start.index),
    };
  });

  return {
    id: crypto.randomUUID(),
    parserVersion: LANGUAGE_COURSE_PARSER_VERSION,
    sourceFileName,
    importedAt: new Date().toISOString(),
    totalPages: pages.length,
    lessons,
  };
}

export function getImportedCourse() {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(LANGUAGE_COURSE_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ImportedCourse;

    if (parsed.parserVersion !== LANGUAGE_COURSE_PARSER_VERSION) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveImportedCourse(course: ImportedCourse) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    LANGUAGE_COURSE_STORAGE_KEY,
    JSON.stringify(course)
  );
}

export function clearImportedCourse() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(LANGUAGE_COURSE_STORAGE_KEY);
  window.localStorage.removeItem(LANGUAGE_PROGRESS_STORAGE_KEY);
}

export function getLessonProgress(lessonId: string): LessonProgress {
  if (!canUseStorage()) {
    return {
      answers: {},
      flippedGlossaryIds: [],
    };
  }

  const raw = window.localStorage.getItem(LANGUAGE_PROGRESS_STORAGE_KEY);

  if (!raw) {
    return {
      answers: {},
      flippedGlossaryIds: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, LessonProgress>;

    return (
      parsed[lessonId] ?? {
        answers: {},
        flippedGlossaryIds: [],
      }
    );
  } catch {
    return {
      answers: {},
      flippedGlossaryIds: [],
    };
  }
}

export function saveLessonProgress(lessonId: string, progress: LessonProgress) {
  if (!canUseStorage()) {
    return;
  }

  const raw = window.localStorage.getItem(LANGUAGE_PROGRESS_STORAGE_KEY);

  let parsed: Record<string, LessonProgress> = {};

  if (raw) {
    try {
      parsed = JSON.parse(raw) as Record<string, LessonProgress>;
    } catch {
      parsed = {};
    }
  }

  parsed[lessonId] = progress;

  window.localStorage.setItem(
    LANGUAGE_PROGRESS_STORAGE_KEY,
    JSON.stringify(parsed)
  );
}
