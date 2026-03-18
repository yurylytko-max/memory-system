import type { ReviewDirection, ReviewPairState, ReviewRating, ReviewState } from "@/lib/study-srs";

export type StudySectionType = "reading" | "exercises" | "custom";

export type GrammarBlock = {
  id: string;
  title: string;
  content: string;
  notes?: string;
};

export type LessonSection = {
  id: string;
  type: StudySectionType;
  title: string;
  content: string;
  notes?: string;
};

export type VocabularyEntry = {
  id: string;
  term: string;
  translation: string;
  article?: string;
  section?: string;
  notes?: string;
  review: ReviewPairState;
};

export type StudyLesson = {
  id: string;
  order: number;
  title: string;
  topic?: string;
  notes?: string;
  grammar: GrammarBlock[];
  vocabulary: VocabularyEntry[];
  sections: LessonSection[];
};

export type StudyTextbook = {
  id: string;
  title: string;
  languageCode: string;
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

export function flattenGlossary(textbook: StudyTextbook): GlossaryCard[] {
  return textbook.lessons.flatMap((lesson) =>
    lesson.vocabulary.map((entry) => ({
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
        return new Date(card.entry.review[direction].dueAt).getTime() <= timestamp;
      }).length
    );
  }, 0);
}

export function buildReviewQueue(
  textbook: StudyTextbook,
  mode: "learn" | "review" | "all",
  now = new Date().toISOString()
): ReviewQueueCard[] {
  const timestamp = new Date(now).getTime();
  const queue = flattenGlossary(textbook).flatMap((card) =>
    (["de_to_ru", "ru_to_de"] as const).map((direction) => ({
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

export function formatVocabularyLabel(entry: VocabularyEntry) {
  return entry.article ? `${entry.article} ${entry.term}` : entry.term;
}

export async function getAllStudyTextbooks(): Promise<StudyTextbook[]> {
  const response = await fetch("/api/study", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load study textbooks");
  }

  const textbooks = await response.json();
  return Array.isArray(textbooks) ? textbooks : [];
}

export async function getStudyTextbook(id: string): Promise<StudyTextbook | undefined> {
  const response = await fetch(`/api/study/${id}`, { cache: "no-store" });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error("Failed to load study textbook");
  }

  return await response.json();
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

  return await response.json();
}

export type SubmitReviewArgs = {
  textbook: StudyTextbook;
  lessonId: string;
  entryId: string;
  direction: ReviewDirection;
  rating: ReviewRating;
};
