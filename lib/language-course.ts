import { z } from "zod";

export const LANGUAGE_COURSE_PARSER_VERSION = 3;
export const LANGUAGE_IMPORT_BATCH_SIZE = 2;

export const importPageTypeSchema = z.enum([
  "lesson_start",
  "lesson_content",
  "exercise",
  "grammar",
  "glossary",
  "workbook",
  "test",
  "answers",
  "other",
]);

export const extractedBlockKindSchema = z.enum([
  "heading",
  "paragraph",
  "dialogue",
  "exercise",
  "grammar",
  "glossary",
  "table",
  "caption",
  "other",
]);

export const extractedBlockSchema = z.object({
  kind: extractedBlockKindSchema,
  text: z.string().min(1).max(2000),
  notes: z.array(z.string().min(1).max(240)).max(4).default([]),
});

export const lessonPageAnalysisSchema = z.object({
  pageNumber: z.number().int().positive(),
  detectedLessonNumber: z.number().int().positive().nullable(),
  detectedLessonTitle: z.string().min(1).max(240).nullable(),
  pageType: importPageTypeSchema,
  belongsToCoursebook: z.boolean(),
  confidence: z.number().min(0).max(1),
  shortSummary: z.string().min(1).max(400),
  extractedBlocks: z.array(extractedBlockSchema).max(20),
});

export const lessonSourceBlockSchema = extractedBlockSchema.extend({
  sourcePage: z.number().int().positive(),
});

export const lessonAssemblySchema = z.object({
  id: z.string().min(1),
  lessonNumber: z.number().int().positive(),
  title: z.string().min(1).max(240),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  sourcePages: z.array(z.number().int().positive()).min(1),
  contentSummary: z.string().min(1).max(1200),
  rawBlocks: z.array(lessonSourceBlockSchema).max(200),
});

export const lessonExerciseSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "fill_in_blank",
    "comprehension",
    "matching",
    "speaking",
    "writing",
    "other",
  ]),
  prompt: z.string().min(1).max(1200),
  instructions: z.string().min(1).max(600),
  answer: z.string().min(1).max(800).nullable(),
  sourcePageNumbers: z.array(z.number().int().positive()).min(1),
});

export const glossaryItemSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1).max(240),
  translation: z.string().min(1).max(240).nullable(),
  partOfSpeech: z.string().min(1).max(120).nullable(),
  context: z.string().min(1).max(400),
  sourcePageNumber: z.number().int().positive(),
});

export const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1).max(240),
  back: z.string().min(1).max(400),
  sourcePageNumber: z.number().int().positive(),
});

export const courseLessonSchema = lessonAssemblySchema.extend({
  exercises: z.array(lessonExerciseSchema).max(16),
  glossary: z.array(glossaryItemSchema).max(24),
  flashcards: z.array(flashcardSchema).max(24).default([]),
});

export const importedCourseSchema = z.object({
  id: z.string().min(1),
  parserVersion: z.number().int().positive(),
  sourceFileName: z.string().min(1),
  importedAt: z.string().min(1),
  totalPages: z.number().int().positive(),
  jobId: z.string().min(1),
  courseTitle: z.string().min(1).nullable(),
  lessons: z.array(courseLessonSchema),
});

export const lessonProgressSchema = z.object({
  notes: z.record(z.string(), z.string()).default({}),
  flippedGlossaryIds: z.array(z.string()).default([]),
});

export const importJobStageSchema = z.enum([
  "uploaded",
  "analyzing_pages",
  "assembling_lessons",
  "generating_lessons",
  "completed",
  "failed",
]);

export const importJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);

export const importJobPageAssetSchema = z.object({
  pageNumber: z.number().int().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  fileName: z.string().min(1),
});

export const importJobSchema = z.object({
  id: z.string().min(1),
  sourceFileName: z.string().min(1),
  courseTitle: z.string().min(1).nullable(),
  totalPages: z.number().int().positive(),
  parserVersion: z.number().int().positive(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  stage: importJobStageSchema,
  status: importJobStatusSchema,
  progressLabel: z.string().min(1),
  errorMessage: z.string().nullable(),
  pageAssets: z.array(importJobPageAssetSchema),
  analyzedPageCount: z.number().int().nonnegative(),
  generatedLessonCount: z.number().int().nonnegative(),
  pageAnalyses: z.array(lessonPageAnalysisSchema),
  lessonDrafts: z.array(lessonAssemblySchema),
  courseId: z.string().nullable(),
});

export type ImportPageType = z.infer<typeof importPageTypeSchema>;
export type ExtractedBlock = z.infer<typeof extractedBlockSchema>;
export type LessonPageAnalysis = z.infer<typeof lessonPageAnalysisSchema>;
export type LessonSourceBlock = z.infer<typeof lessonSourceBlockSchema>;
export type LessonAssembly = z.infer<typeof lessonAssemblySchema>;
export type LessonExercise = z.infer<typeof lessonExerciseSchema>;
export type GlossaryItem = z.infer<typeof glossaryItemSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;
export type CourseLesson = z.infer<typeof courseLessonSchema>;
export type ImportedCourse = z.infer<typeof importedCourseSchema>;
export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export type ImportJobPageAsset = z.infer<typeof importJobPageAssetSchema>;
export type ImportJob = z.infer<typeof importJobSchema>;

const LANGUAGE_PROGRESS_STORAGE_KEY = "language_course_progress_db_v3";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getLessonProgress(lessonId: string): LessonProgress {
  if (!canUseStorage()) {
    return lessonProgressSchema.parse({});
  }

  const raw = window.localStorage.getItem(LANGUAGE_PROGRESS_STORAGE_KEY);

  if (!raw) {
    return lessonProgressSchema.parse({});
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return lessonProgressSchema.parse(parsed[lessonId] ?? {});
  } catch {
    return lessonProgressSchema.parse({});
  }
}

export function saveLessonProgress(lessonId: string, progress: LessonProgress) {
  if (!canUseStorage()) {
    return;
  }

  const raw = window.localStorage.getItem(LANGUAGE_PROGRESS_STORAGE_KEY);
  let parsed: Record<string, unknown> = {};

  if (raw) {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }

  parsed[lessonId] = lessonProgressSchema.parse(progress);

  window.localStorage.setItem(
    LANGUAGE_PROGRESS_STORAGE_KEY,
    JSON.stringify(parsed)
  );
}
