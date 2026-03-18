import { z } from "zod";

import type { StudyLesson, StudyTextbook, VocabularyEntry } from "@/lib/study";
import { createInitialReviewPair } from "@/lib/study-srs";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const reviewStateSchema = z
  .object({
    status: z.enum(["new", "learning", "review"]).optional(),
    dueAt: z.string().optional(),
    intervalDays: z.number().optional(),
    easeFactor: z.number().optional(),
    streak: z.number().optional(),
    lapses: z.number().optional(),
    lastReviewedAt: z.string().optional(),
    history: z
      .array(
        z.object({
          reviewedAt: z.string(),
          rating: z.enum(["again", "hard", "good", "easy"]),
          intervalDays: z.number(),
          dueAt: z.string(),
        })
      )
      .optional(),
  })
  .optional();

const vocabularySchema = z.object({
  id: z.string().optional(),
  term: z.string().min(1),
  translation: z.string().min(1),
  article: z.string().optional(),
  section: z.string().optional(),
  notes: z.string().optional(),
  review: z
    .object({
      de_to_ru: reviewStateSchema,
      ru_to_de: reviewStateSchema,
    })
    .optional(),
});

const grammarSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  content: z.string().default(""),
  notes: z.string().optional(),
});

const sectionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["reading", "exercises", "custom"]).default("custom"),
  title: z.string().min(1),
  content: z.string().default(""),
  notes: z.string().optional(),
});

const lessonSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().positive().optional(),
  title: z.string().min(1),
  topic: z.string().optional(),
  notes: z.string().optional(),
  grammar: z.array(grammarSchema).default([]),
  vocabulary: z.array(vocabularySchema).default([]),
  sections: z.array(sectionSchema).default([]),
});

const textbookSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  languageCode: z.string().default("de"),
  level: z.string().optional(),
  series: z.string().optional(),
  notes: z.string().optional(),
  lessons: z.array(lessonSchema).default([]),
});

function normalizeVocabulary(raw: z.infer<typeof vocabularySchema>, now: string): VocabularyEntry {
  const initial = createInitialReviewPair(now);

  return {
    id: raw.id ?? makeId(),
    term: raw.term.trim(),
    translation: raw.translation.trim(),
    article: raw.article?.trim(),
    section: raw.section?.trim(),
    notes: raw.notes?.trim(),
    review: {
      de_to_ru: {
        ...initial.de_to_ru,
        ...raw.review?.de_to_ru,
        history: raw.review?.de_to_ru?.history ?? initial.de_to_ru.history,
      },
      ru_to_de: {
        ...initial.ru_to_de,
        ...raw.review?.ru_to_de,
        history: raw.review?.ru_to_de?.history ?? initial.ru_to_de.history,
      },
    },
  };
}

function normalizeLesson(raw: z.infer<typeof lessonSchema>, index: number, now: string): StudyLesson {
  return {
    id: raw.id ?? makeId(),
    order: raw.order ?? index + 1,
    title: raw.title.trim(),
    topic: raw.topic?.trim(),
    notes: raw.notes?.trim(),
    grammar: raw.grammar.map((block) => ({
      id: block.id ?? makeId(),
      title: block.title.trim(),
      content: block.content,
      notes: block.notes?.trim(),
    })),
    vocabulary: raw.vocabulary.map((entry) => normalizeVocabulary(entry, now)),
    sections: raw.sections.map((section) => ({
      id: section.id ?? makeId(),
      type: section.type,
      title: section.title.trim(),
      content: section.content,
      notes: section.notes?.trim(),
    })),
  };
}

export function normalizeStudyImport(input: unknown): StudyTextbook {
  const parsed = textbookSchema.parse(input);
  const now = new Date().toISOString();

  return {
    id: parsed.id ?? makeId(),
    title: parsed.title.trim(),
    languageCode: parsed.languageCode.trim() || "de",
    level: parsed.level?.trim(),
    series: parsed.series?.trim(),
    notes: parsed.notes?.trim(),
    createdAt: now,
    updatedAt: now,
    lessons: parsed.lessons.map((lesson, index) => normalizeLesson(lesson, index, now)),
  };
}

export const STUDY_IMPORT_TEMPLATE = {
  title: "Netzwerk A1",
  languageCode: "de",
  level: "A1",
  series: "Netzwerk",
  notes: "Поток учебников одной серии.",
  lessons: [
    {
      order: 1,
      title: "Lektion 1",
      topic: "Sich vorstellen",
      notes: "Личные заметки по уроку.",
      grammar: [
        {
          title: "sein: ich bin, du bist",
          content: "Краткое объяснение правила и свои пометки.",
          notes: "Сделать акцент на форме du bist.",
        },
      ],
      vocabulary: [
        {
          term: "Name",
          translation: "имя",
          article: "der",
          section: "reading",
        },
        {
          term: "heiBen",
          translation: "называться",
          section: "glossary",
        },
      ],
      sections: [
        {
          type: "reading",
          title: "Текст",
          content: "Текст урока или отрывок для чтения.",
        },
        {
          type: "exercises",
          title: "Упражнения",
          content: "Список упражнений и свои ответы.",
        },
      ],
    },
  ],
};
