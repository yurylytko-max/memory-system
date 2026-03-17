import "server-only";

import { readFile } from "node:fs/promises";

import { z } from "zod";

import {
  LANGUAGE_COURSE_PARSER_VERSION,
  LANGUAGE_IMPORT_BATCH_SIZE,
  courseLessonSchema,
  importedCourseSchema,
  importJobSchema,
  lessonAssemblySchema,
  lessonPageAnalysisSchema,
  type CourseLesson,
  type ImportedCourse,
  type ImportJob,
  type ImportJobPageAsset,
  type LessonAssembly,
  type LessonPageAnalysis,
} from "@/lib/language-course";
import {
  getJobPageImagePath,
  readCourse,
  readImportJob,
  upsertCourse,
  upsertImportJob,
} from "@/lib/server/language-course-store";

const DEFAULT_MODEL = process.env.LANGUAGE_IMPORT_OPENAI_MODEL || "gpt-4o-mini";

const pageAnalysisBatchSchema = z.object({
  pages: z.array(lessonPageAnalysisSchema),
});

const lessonAssemblyResultSchema = z.object({
  courseTitle: z.string().min(1).max(240).nullable(),
  lessons: z.array(lessonAssemblySchema),
});

const pedagogicalLessonResultSchema = z.object({
  lesson: courseLessonSchema,
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

function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY;
}

function buildDataUrl(mimeType: string, bytes: Buffer) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function extractStructuredText(payload: unknown): Promise<string> {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid OpenAI response payload.");
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.length > 0) {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];

  for (const item of output) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];

    for (const contentItem of content) {
      if (typeof contentItem !== "object" || contentItem === null) {
        continue;
      }

      const asRecord = contentItem as Record<string, unknown>;
      const candidate =
        typeof asRecord.text === "string"
          ? asRecord.text
          : typeof asRecord.value === "string"
            ? asRecord.value
            : null;

      if (candidate) {
        return candidate;
      }
    }
  }

  throw new Error("OpenAI response did not contain structured text output.");
}

async function callStructuredOpenAI<T>({
  schema,
  name,
  prompt,
  imageDataUrls = [],
}: {
  schema: z.ZodType<T>;
  name: string;
  prompt: string;
  imageDataUrls?: string[];
}) {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const schemaJson = z.toJSONSchema(schema, {
    reused: "inline",
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            ...imageDataUrls.map((imageUrl) => ({
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name,
          schema: schemaJson,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI request failed with ${response.status}: ${errorText.slice(0, 500)}`
    );
  }

  const payload = (await response.json()) as unknown;
  const rawText = await extractStructuredText(payload);
  return schema.parse(JSON.parse(rawText));
}

function summarizePageTypes(pageAnalyses: LessonPageAnalysis[]) {
  return pageAnalyses
    .map(
      (analysis) =>
        `Page ${analysis.pageNumber}: type=${analysis.pageType}, lesson=${analysis.detectedLessonNumber ?? "?"}, title=${analysis.detectedLessonTitle ?? "?"}, coursebook=${analysis.belongsToCoursebook}, summary=${analysis.shortSummary}`
    )
    .join("\n");
}

async function analyzePageBatch(job: ImportJob): Promise<ImportJob> {
  const remainingAssets = job.pageAssets.filter(
    (asset) =>
      !job.pageAnalyses.some((analysis) => analysis.pageNumber === asset.pageNumber)
  );
  const batch = remainingAssets.slice(0, LANGUAGE_IMPORT_BATCH_SIZE);

  if (batch.length === 0) {
    return {
      ...job,
      stage: "assembling_lessons",
      status: "running",
      progressLabel: "Stage B: assembling lessons...",
      updatedAt: nowIso(),
    };
  }

  const prompt = [
    "You are analyzing textbook pages for a German language course import pipeline.",
    "Treat page images as the source of truth. Do not invent text that is not visible.",
    "Return one JSON item per page.",
    "Mark belongsToCoursebook=false for workbook, tests, answer keys, appendices, or noise.",
    "Keep extractedBlocks concise and cleaned. Preserve exercise wording if visible.",
    "Use the provided page order and page numbers exactly.",
    "",
    "Pages in this batch:",
    ...batch.map(
      (asset) =>
        `- pageNumber=${asset.pageNumber}, imageFile=${asset.fileName}, size=${Math.round(asset.width)}x${Math.round(asset.height)}`
    ),
  ].join("\n");

  const imageDataUrls = await Promise.all(
    batch.map(async (asset) => {
      const imagePath = getJobPageImagePath(job.id, asset.fileName);
      const bytes = await readFile(imagePath);
      return buildDataUrl("image/jpeg", bytes);
    })
  );

  const result = await callStructuredOpenAI({
    schema: pageAnalysisBatchSchema,
    name: "page_analysis_batch",
    prompt,
    imageDataUrls,
  });

  const validatedPages = result.pages
    .map((page, index) =>
      lessonPageAnalysisSchema.parse({
        ...page,
        pageNumber: batch[index]?.pageNumber ?? page.pageNumber,
      })
    )
    .sort((left, right) => left.pageNumber - right.pageNumber);

  const mergedAnalyses = [...job.pageAnalyses, ...validatedPages].sort(
    (left, right) => left.pageNumber - right.pageNumber
  );
  const analyzedPageCount = mergedAnalyses.length;
  const hasMorePages = analyzedPageCount < job.totalPages;

  return importJobSchema.parse({
    ...job,
    updatedAt: nowIso(),
    stage: hasMorePages ? "analyzing_pages" : "assembling_lessons",
    status: "running",
    progressLabel: hasMorePages
      ? `Stage A: analyzed ${analyzedPageCount}/${job.totalPages} pages`
      : "Stage B: assembling lessons...",
    analyzedPageCount,
    pageAnalyses: mergedAnalyses,
  });
}

async function assembleLessons(job: ImportJob): Promise<ImportJob> {
  const analyses = [...job.pageAnalyses].sort(
    (left, right) => left.pageNumber - right.pageNumber
  );

  const prompt = [
    "You are assembling lessons from page-level analyses for a language textbook.",
    "Use the page analyses as the source of truth.",
    "Only create lessons from coursebook pages.",
    "Exclude workbook, tests, answers, and noise.",
    "Each lesson must have a stable id, lessonNumber, title, page range, sourcePages, contentSummary, and rawBlocks.",
    "rawBlocks must come from the provided extracted blocks and must include sourcePage.",
    "Do not merge unrelated lessons. Do not leave gaps inside a lesson unless the page is clearly not coursebook content.",
    "",
    summarizePageTypes(analyses),
    "",
    "Full page analysis JSON:",
    JSON.stringify(analyses),
  ].join("\n");

  const result = await callStructuredOpenAI({
    schema: lessonAssemblyResultSchema,
    name: "lesson_assembly",
    prompt,
  });

  const lessons = result.lessons
    .map((lesson, index) => {
      const sourcePages = dedupeNumbers(lesson.sourcePages);
      const pageStart = Math.min(...sourcePages);
      const pageEnd = Math.max(...sourcePages);

      return lessonAssemblySchema.parse({
        ...lesson,
        id:
          lesson.id.trim().length > 0
            ? lesson.id
            : `lesson-${lesson.lessonNumber}-${index + 1}`,
        sourcePages,
        pageStart,
        pageEnd,
      });
    })
    .sort((left, right) => left.lessonNumber - right.lessonNumber);

  return importJobSchema.parse({
    ...job,
    updatedAt: nowIso(),
    stage: lessons.length > 0 ? "generating_lessons" : "failed",
    status: lessons.length > 0 ? "running" : "failed",
    progressLabel:
      lessons.length > 0
        ? `Stage C: generated 0/${lessons.length} lessons`
        : "No lessons could be assembled from page analyses.",
    errorMessage:
      lessons.length > 0
        ? null
        : "The model did not assemble any coursebook lessons.",
    courseTitle: result.courseTitle ?? job.courseTitle,
    lessonDrafts: lessons,
  });
}

function compactLessonForPrompt(lesson: LessonAssembly) {
  const blocks = lesson.rawBlocks
    .slice(0, 80)
    .map(
      (block) =>
        `Page ${block.sourcePage} [${block.kind}] ${block.text}${block.notes.length > 0 ? ` (${block.notes.join("; ")})` : ""}`
    )
    .join("\n");

  return [
    `Lesson number: ${lesson.lessonNumber}`,
    `Lesson title: ${lesson.title}`,
    `Page range: ${lesson.pageStart}-${lesson.pageEnd}`,
    `Summary: ${lesson.contentSummary}`,
    "Lesson blocks:",
    blocks,
  ].join("\n");
}

async function generateLesson(job: ImportJob): Promise<ImportJob> {
  const generatedCount = job.generatedLessonCount;
  const lesson = job.lessonDrafts[generatedCount];

  if (!lesson) {
    return completeCourse(job, []);
  }

  const prompt = [
    "You are generating structured pedagogical data for one German language lesson.",
    "Use only the provided lesson summary and extracted blocks.",
    "Prefer clean, useful exercises over quantity.",
    "Glossary must include high-value vocabulary actually present in the lesson.",
    "If a translation is uncertain, return null instead of guessing.",
    "Keep flashcards optional and concise.",
    "",
    compactLessonForPrompt(lesson),
  ].join("\n");

  const result = await callStructuredOpenAI({
    schema: pedagogicalLessonResultSchema,
    name: "pedagogical_lesson",
    prompt,
  });

  const nextLesson = courseLessonSchema.parse({
    ...result.lesson,
    id: lesson.id,
    lessonNumber: lesson.lessonNumber,
    title: lesson.title,
    pageStart: lesson.pageStart,
    pageEnd: lesson.pageEnd,
    sourcePages: lesson.sourcePages,
    contentSummary: result.lesson.contentSummary || lesson.contentSummary,
    rawBlocks: lesson.rawBlocks,
  });

  return completeCourse(job, [nextLesson]);
}

async function completeCourse(
  job: ImportJob,
  appendedLessons: CourseLesson[]
): Promise<ImportJob> {
  const partialCourse = await readCourseForJob(job);
  const mergedLessons = [...partialCourse.lessons, ...appendedLessons].sort(
    (left, right) => left.lessonNumber - right.lessonNumber
  );
  const generatedLessonCount = mergedLessons.length;
  const isComplete = generatedLessonCount >= job.lessonDrafts.length;
  const courseId = partialCourse.id;

  const course = importedCourseSchema.parse({
    ...partialCourse,
    id: courseId,
    parserVersion: LANGUAGE_COURSE_PARSER_VERSION,
    sourceFileName: job.sourceFileName,
    importedAt: partialCourse.importedAt,
    totalPages: job.totalPages,
    jobId: job.id,
    courseTitle: partialCourse.courseTitle ?? job.courseTitle,
    lessons: mergedLessons,
  });

  await upsertCourse(course);

  return importJobSchema.parse({
    ...job,
    updatedAt: nowIso(),
    stage: isComplete ? "completed" : "generating_lessons",
    status: isComplete ? "completed" : "running",
    progressLabel: isComplete
      ? `Completed: ${mergedLessons.length} lessons ready`
      : `Stage C: generated ${generatedLessonCount}/${job.lessonDrafts.length} lessons`,
    generatedLessonCount,
    courseId,
    errorMessage: null,
  });
}

async function readCourseForJob(job: ImportJob): Promise<ImportedCourse> {
  const emptyCourse = importedCourseSchema.parse({
    id: job.courseId ?? `course-${slugify(job.courseTitle ?? job.sourceFileName)}-${job.id.slice(0, 8)}`,
    parserVersion: LANGUAGE_COURSE_PARSER_VERSION,
    sourceFileName: job.sourceFileName,
    importedAt: nowIso(),
    totalPages: job.totalPages,
    jobId: job.id,
    courseTitle: job.courseTitle,
    lessons: [],
  });

  if (!job.courseId) {
    return emptyCourse;
  }

  const course = await readCourse(job.courseId);
  return course ?? emptyCourse;
}

export async function createImportJob(input: {
  sourceFileName: string;
  totalPages: number;
  pageAssets: ImportJobPageAsset[];
}) {
  const timestamp = nowIso();

  const job = importJobSchema.parse({
    id: crypto.randomUUID(),
    sourceFileName: input.sourceFileName,
    courseTitle: null,
    totalPages: input.totalPages,
    parserVersion: LANGUAGE_COURSE_PARSER_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    stage: "uploaded",
    status: "queued",
    progressLabel: "Upload complete. Ready for Stage A.",
    errorMessage: null,
    pageAssets: input.pageAssets,
    analyzedPageCount: 0,
    generatedLessonCount: 0,
    pageAnalyses: [],
    lessonDrafts: [],
    courseId: null,
  });

  await upsertImportJob(job);
  return job;
}

export async function advanceImportJob(jobId: string) {
  const currentJob = await readImportJob(jobId);

  if (!currentJob) {
    throw new Error("Import job not found.");
  }

  if (currentJob.status === "completed" || currentJob.status === "failed") {
    return currentJob;
  }

  let nextJob = currentJob;

  try {
    if (
      currentJob.stage === "uploaded" ||
      currentJob.stage === "analyzing_pages"
    ) {
      nextJob = await analyzePageBatch({
        ...currentJob,
        status: "running",
        stage:
          currentJob.stage === "uploaded"
            ? "analyzing_pages"
            : currentJob.stage,
      });
    } else if (currentJob.stage === "assembling_lessons") {
      nextJob = await assembleLessons(currentJob);
    } else if (currentJob.stage === "generating_lessons") {
      nextJob = await generateLesson(currentJob);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    nextJob = importJobSchema.parse({
      ...currentJob,
      updatedAt: nowIso(),
      stage: "failed",
      status: "failed",
      errorMessage: message,
      progressLabel: message,
    });
  }

  await upsertImportJob(nextJob);
  return nextJob;
}
