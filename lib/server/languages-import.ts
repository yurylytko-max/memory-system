import "server-only";

import { z } from "zod";

import {
  LANGUAGE_IMPORT_BATCH_SIZE,
  LANGUAGE_WORKSPACE_VERSION,
  languageCourseSchema,
  languageImportJobSchema,
  languageLessonDraftSchema,
  languageLessonSchema,
  languagePageAnalysisSchema,
  type LanguageCourse,
  type LanguageImportJob,
  type LanguageLesson,
  type LanguageLessonDraft,
  type LanguagePageAnalysis,
  type LanguagePageAsset,
} from "@/lib/languages";
import {
  readLanguageCourse,
  readLanguageImportJob,
  upsertLanguageCourse,
  upsertLanguageImportJob,
} from "@/lib/server/languages-store";
import { callStructuredLanguageModel } from "@/lib/server/languages-ai";

const pageAnalysisBatchSchema = z.object({
  pages: z.array(
    languagePageAnalysisSchema.omit({
      id: true,
    })
  ),
});

const lessonAssemblyResultSchema = z.object({
  courseTitle: z.string().min(1).max(240).nullable(),
  lessons: z.array(
    languageLessonDraftSchema.omit({
      blocks: true,
      id: true,
    }).extend({
      blocks: z.array(
        languageLessonDraftSchema.shape.blocks.element.omit({
          sourcePage: true,
        }).extend({
          sourcePage: z.number().int().positive(),
        })
      ),
    })
  ),
});

const pedagogicalLessonResultSchema = z.object({
  lesson: languageLessonSchema.omit({
    pageRange: true,
    sourcePages: true,
    blocks: true,
    id: true,
    number: true,
    title: true,
  }),
});

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function dedupeNumbers(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function summarizePageAnalyses(pageAnalyses: LanguagePageAnalysis[]) {
  return pageAnalyses
    .map(
      (analysis) =>
        `Page ${analysis.pageNumber}: type=${analysis.pageType}, lesson=${analysis.detectedLessonNumber ?? "?"}, title=${analysis.detectedLessonTitle ?? "?"}, coursebook=${analysis.belongsToCoursebook}, summary=${analysis.shortSummary}`
    )
    .join("\n");
}

function compactLessonForPrompt(lesson: LanguageLessonDraft) {
  const blocks = lesson.blocks
    .slice(0, 80)
    .map(
      (block) =>
        `Page ${block.sourcePage} [${block.kind}] ${block.text}${block.notes.length > 0 ? ` (${block.notes.join("; ")})` : ""}`
    )
    .join("\n");

  return [
    `Lesson number: ${lesson.number}`,
    `Lesson title: ${lesson.title}`,
    `Page range: ${lesson.pageStart}-${lesson.pageEnd}`,
    `Summary: ${lesson.summary}`,
    "Lesson blocks:",
    blocks,
  ].join("\n");
}

type UploadedLanguagePage = {
  asset: LanguagePageAsset;
  bytes: Uint8Array;
};

async function analyzeUploadedPageBatch(
  job: LanguageImportJob,
  uploadedPages: UploadedLanguagePage[]
): Promise<LanguageImportJob> {
  const alreadyAnalyzedPages = new Set(job.pageAnalyses.map((page) => page.pageNumber));
  const batch = uploadedPages
    .filter((item) => !alreadyAnalyzedPages.has(item.asset.pageNumber))
    .slice(0, LANGUAGE_IMPORT_BATCH_SIZE);

  if (batch.length === 0) {
    return languageImportJobSchema.parse({
      ...job,
      stage: "assembling_lessons",
      status: "running",
      progressLabel: "Stage B: assembling lessons...",
      updatedAt: nowIso(),
    });
  }

  const prompt = [
    "You are analyzing textbook pages for a language-learning import pipeline.",
    "Treat page images as the source of truth.",
    "Return one JSON item per page in the exact order given.",
    "Mark belongsToCoursebook=false for workbook, tests, answers, or noise.",
    "Keep extractedBlocks concise, useful, and cleaned.",
    "",
    "Pages in this batch:",
    ...batch.map(
      ({ asset }) =>
        `- pageNumber=${asset.pageNumber}, imageFile=${asset.fileName}, size=${Math.round(asset.width)}x${Math.round(asset.height)}`
    ),
  ].join("\n");

  const imageBase64s = batch.map(({ bytes }) => Buffer.from(bytes).toString("base64"));

  const result = await callStructuredLanguageModel({
    schema: pageAnalysisBatchSchema,
    name: "language_page_analysis_batch",
    purpose: "import",
    prompt,
    imageBase64s,
  });

  const analyzedPages = result.pages.map((page, index) =>
    languagePageAnalysisSchema.parse({
      ...page,
      id: `${job.id}-page-${batch[index]?.asset.pageNumber ?? page.pageNumber}`,
      pageNumber: batch[index]?.asset.pageNumber ?? page.pageNumber,
    })
  );

  const merged = [...job.pageAnalyses, ...analyzedPages].sort(
    (left, right) => left.pageNumber - right.pageNumber
  );
  const analyzedPageCount = merged.length;
  const hasMore = analyzedPageCount < job.totalPages;

  return languageImportJobSchema.parse({
    ...job,
    pageAnalyses: merged,
    analyzedPageCount,
    updatedAt: nowIso(),
    stage: hasMore ? "analyzing_pages" : "assembling_lessons",
    status: "running",
    progressLabel: hasMore
      ? `Stage A: analyzed ${analyzedPageCount}/${job.totalPages} pages`
      : "Stage B: assembling lessons...",
  });
}

async function assembleLessons(job: LanguageImportJob): Promise<LanguageImportJob> {
  const analyses = [...job.pageAnalyses].sort(
    (left, right) => left.pageNumber - right.pageNumber
  );

  const prompt = [
    "You are assembling lessons from analyzed language-textbook pages.",
    "Only create lessons from coursebook pages.",
    "Exclude workbook, tests, answer keys, and noise.",
    "Each lesson needs number, title, pageStart, pageEnd, sourcePages, summary, and blocks.",
    "blocks must come from the extracted page blocks.",
    "",
    summarizePageAnalyses(analyses),
    "",
    JSON.stringify(analyses),
  ].join("\n");

  const result = await callStructuredLanguageModel({
    schema: lessonAssemblyResultSchema,
    name: "language_lesson_assembly",
    purpose: "import",
    prompt,
  });

  const lessons = result.lessons
    .map((lesson, index) => {
      const sourcePages = dedupeNumbers(lesson.sourcePages);

      return languageLessonDraftSchema.parse({
        ...lesson,
        id: `lesson-${lesson.number}-${slugify(lesson.title || `lesson-${index + 1}`)}`,
        sourcePages,
        pageStart: Math.min(...sourcePages),
        pageEnd: Math.max(...sourcePages),
      });
    })
    .sort((left, right) => left.number - right.number);

  return languageImportJobSchema.parse({
    ...job,
    courseTitle: result.courseTitle ?? job.courseTitle,
    lessonDrafts: lessons,
    lessonDraftCount: lessons.length,
    updatedAt: nowIso(),
    stage: lessons.length > 0 ? "generating_lessons" : "failed",
    status: lessons.length > 0 ? "running" : "failed",
    progressLabel:
      lessons.length > 0
        ? `Stage C: generated 0/${lessons.length} lessons`
        : "No lessons could be assembled.",
    errorMessage:
      lessons.length > 0 ? null : "The model did not assemble any lessons.",
  });
}

async function readOrCreateCourseForJob(job: LanguageImportJob): Promise<LanguageCourse> {
  if (job.languageCourseId) {
    const existing = await readLanguageCourse(job.languageCourseId);
    if (existing) {
      return existing;
    }
  }

  return languageCourseSchema.parse({
    id: `course-${job.id}`,
    workspaceVersion: LANGUAGE_WORKSPACE_VERSION,
    title: job.courseTitle ?? job.sourceFileName,
    sourceFileName: job.sourceFileName,
    importedAt: nowIso(),
    totalPages: job.totalPages,
    lessonCount: 0,
    pageAnalyses: job.pageAnalyses,
    lessons: [],
  });
}

async function completeCourse(
  job: LanguageImportJob,
  appendedLessons: LanguageLesson[]
): Promise<LanguageImportJob> {
  const course = await readOrCreateCourseForJob(job);
  const mergedLessons = [...course.lessons, ...appendedLessons].sort(
    (left, right) => left.number - right.number
  );
  const generatedLessonCount = mergedLessons.length;
  const isComplete = generatedLessonCount >= job.lessonDrafts.length;

  const nextCourse = languageCourseSchema.parse({
    ...course,
    title: job.courseTitle ?? course.title,
    sourceFileName: job.sourceFileName,
    totalPages: job.totalPages,
    lessonCount: mergedLessons.length,
    pageAnalyses: job.pageAnalyses,
    lessons: mergedLessons,
  });

  await upsertLanguageCourse(nextCourse);

  return languageImportJobSchema.parse({
    ...job,
    languageCourseId: nextCourse.id,
    generatedLessonCount,
    updatedAt: nowIso(),
    stage: isComplete ? "completed" : "generating_lessons",
    status: isComplete ? "completed" : "running",
    progressLabel: isComplete
      ? `Completed: ${mergedLessons.length} lessons ready`
      : `Stage C: generated ${generatedLessonCount}/${job.lessonDrafts.length} lessons`,
    errorMessage: null,
  });
}

async function generateLesson(job: LanguageImportJob): Promise<LanguageImportJob> {
  const generatedCount = job.generatedLessonCount;
  const lessonDraft = job.lessonDrafts[generatedCount];

  if (!lessonDraft) {
    return completeCourse(job, []);
  }

  const prompt = [
    "You are generating structured pedagogical lesson data for a language course workspace.",
    "Use only the provided lesson summary and blocks.",
    "Return clear exercises, glossary items, and optional flashcards.",
    "If a translation is uncertain, return null.",
    "",
    compactLessonForPrompt(lessonDraft),
  ].join("\n");

  const result = await callStructuredLanguageModel({
    schema: pedagogicalLessonResultSchema,
    name: "language_pedagogical_lesson",
    purpose: "import",
    prompt,
  });

  const lesson = languageLessonSchema.parse({
    id: lessonDraft.id,
    number: lessonDraft.number,
    title: lessonDraft.title,
    pageRange: {
      start: lessonDraft.pageStart,
      end: lessonDraft.pageEnd,
    },
    sourcePages: lessonDraft.sourcePages,
    summary: result.lesson.summary || lessonDraft.summary,
    blocks: lessonDraft.blocks,
    exercises: result.lesson.exercises,
    glossary: result.lesson.glossary,
    flashcards: result.lesson.flashcards,
  });

  return completeCourse(job, [lesson]);
}

export async function createLanguageImportJob(input: {
  sourceFileName: string;
  totalPages: number;
  pageAssets: LanguagePageAsset[];
}) {
  const timestamp = nowIso();
  const job = languageImportJobSchema.parse({
    id: crypto.randomUUID(),
    sourceFileName: input.sourceFileName,
    courseTitle: null,
    status: "queued",
    stage: "uploaded",
    progressLabel: "Upload complete. Ready for Stage A.",
    errorMessage: null,
    totalPages: input.totalPages,
    analyzedPageCount: 0,
    generatedLessonCount: 0,
    lessonDraftCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    pageAssets: input.pageAssets,
    pageAnalyses: [],
    lessonDrafts: [],
    languageCourseId: null,
  });

  await upsertLanguageImportJob(job);
  return job;
}

export async function advanceLanguageImportJob(
  jobId: string,
  uploadedPages: UploadedLanguagePage[] = []
) {
  const currentJob = await readLanguageImportJob(jobId);

  if (!currentJob) {
    throw new Error("Import job not found.");
  }

  if (currentJob.status === "completed" || currentJob.status === "failed") {
    return currentJob;
  }

  let nextJob = currentJob;

  try {
    if (currentJob.stage === "uploaded" || currentJob.stage === "analyzing_pages") {
      nextJob = await analyzeUploadedPageBatch(
        {
          ...currentJob,
          status: "running",
          stage:
            currentJob.stage === "uploaded"
              ? "analyzing_pages"
              : currentJob.stage,
        },
        uploadedPages
      );
    } else if (currentJob.stage === "assembling_lessons") {
      nextJob = await assembleLessons(currentJob);
    } else if (currentJob.stage === "generating_lessons") {
      nextJob = await generateLesson(currentJob);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    console.error("Language import job failed:", {
      jobId: currentJob.id,
      stage: currentJob.stage,
      message,
    });
    nextJob = languageImportJobSchema.parse({
      ...currentJob,
      updatedAt: nowIso(),
      stage: "failed",
      status: "failed",
      progressLabel: message,
      errorMessage: message,
    });
  }

  await upsertLanguageImportJob(nextJob);
  return nextJob;
}
