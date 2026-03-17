import { z } from "zod";

export const LANGUAGE_WORKSPACE_VERSION = 1;
export const LANGUAGE_IMPORT_BATCH_SIZE = 2;

export const languagePageTypeSchema = z.enum([
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

export const languageBlockKindSchema = z.enum([
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

export const languageExtractedBlockSchema = z.object({
  kind: languageBlockKindSchema,
  text: z.string().min(1).max(2000),
  notes: z.array(z.string().min(1).max(240)).max(4).default([]),
});

export const languagePageAnalysisSchema = z.object({
  id: z.string().min(1),
  pageNumber: z.number().int().positive(),
  detectedLessonNumber: z.number().int().positive().nullable(),
  detectedLessonTitle: z.string().min(1).max(240).nullable(),
  pageType: languagePageTypeSchema,
  belongsToCoursebook: z.boolean(),
  confidence: z.number().min(0).max(1),
  shortSummary: z.string().min(1).max(400),
  extractedBlocks: z.array(languageExtractedBlockSchema).max(20),
});

export const languagePageAssetSchema = z.object({
  pageNumber: z.number().int().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  fileName: z.string().min(1),
});

export const languageLessonBlockSchema = languageExtractedBlockSchema.extend({
  sourcePage: z.number().int().positive(),
});

export const languageLessonDraftSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1).max(240),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  sourcePages: z.array(z.number().int().positive()).min(1),
  summary: z.string().min(1).max(1200),
  blocks: z.array(languageLessonBlockSchema).max(200),
});

export const languageExerciseSchema = z.object({
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

export const languageGlossaryItemSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1).max(240),
  translation: z.string().min(1).max(240).nullable(),
  partOfSpeech: z.string().min(1).max(120).nullable(),
  context: z.string().min(1).max(400),
  sourcePageNumber: z.number().int().positive(),
});

export const languageFlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1).max(240),
  back: z.string().min(1).max(400),
  sourcePageNumber: z.number().int().positive(),
});

export const languageLessonSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  pageRange: z.object({
    start: z.number().int().positive(),
    end: z.number().int().positive(),
  }),
  sourcePages: z.array(z.number().int().positive()).min(1),
  summary: z.string().min(1),
  blocks: z.array(languageLessonBlockSchema),
  exercises: z.array(languageExerciseSchema),
  glossary: z.array(languageGlossaryItemSchema),
  flashcards: z.array(languageFlashcardSchema).default([]),
});

export const languageCourseSchema = z.object({
  id: z.string().min(1),
  workspaceVersion: z.number().int().positive(),
  title: z.string().min(1),
  sourceFileName: z.string().min(1),
  importedAt: z.string().min(1),
  totalPages: z.number().int().positive(),
  lessonCount: z.number().int().nonnegative(),
  pageAnalyses: z.array(languagePageAnalysisSchema),
  lessons: z.array(languageLessonSchema),
});

export const languageImportJobStageSchema = z.enum([
  "uploaded",
  "analyzing_pages",
  "assembling_lessons",
  "generating_lessons",
  "completed",
  "failed",
]);

export const languageImportJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);

export const languageImportJobSchema = z.object({
  id: z.string().min(1),
  sourceFileName: z.string().min(1),
  courseTitle: z.string().nullable(),
  status: languageImportJobStatusSchema,
  stage: languageImportJobStageSchema,
  progressLabel: z.string().min(1),
  errorMessage: z.string().nullable(),
  totalPages: z.number().int().positive(),
  analyzedPageCount: z.number().int().nonnegative(),
  generatedLessonCount: z.number().int().nonnegative(),
  lessonDraftCount: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  pageAssets: z.array(languagePageAssetSchema),
  pageAnalyses: z.array(languagePageAnalysisSchema),
  lessonDrafts: z.array(languageLessonDraftSchema),
  languageCourseId: z.string().nullable(),
});

export const languageTutorMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  createdAt: z.string().min(1),
});

export const languageTutorThreadSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  lessonId: z.string().nullable(),
  title: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  messages: z.array(languageTutorMessageSchema),
});

export type LanguagePageAnalysis = z.infer<typeof languagePageAnalysisSchema>;
export type LanguagePageAsset = z.infer<typeof languagePageAssetSchema>;
export type LanguageLessonDraft = z.infer<typeof languageLessonDraftSchema>;
export type LanguageExercise = z.infer<typeof languageExerciseSchema>;
export type LanguageGlossaryItem = z.infer<typeof languageGlossaryItemSchema>;
export type LanguageFlashcard = z.infer<typeof languageFlashcardSchema>;
export type LanguageLesson = z.infer<typeof languageLessonSchema>;
export type LanguageCourse = z.infer<typeof languageCourseSchema>;
export type LanguageImportJob = z.infer<typeof languageImportJobSchema>;
export type LanguageTutorMessage = z.infer<typeof languageTutorMessageSchema>;
export type LanguageTutorThread = z.infer<typeof languageTutorThreadSchema>;
