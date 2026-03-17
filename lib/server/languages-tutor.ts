import "server-only";

import {
  languageTutorThreadSchema,
  type LanguageCourse,
  type LanguageTutorMessage,
  type LanguageTutorThread,
} from "@/lib/languages";
import {
  readLanguageCourse,
  readLanguageTutorThread,
  upsertLanguageTutorThread,
} from "@/lib/server/languages-store";
import { callLanguageTextModel } from "@/lib/server/languages-ai";

function nowIso() {
  return new Date().toISOString();
}

function buildCourseContext(course: LanguageCourse, lessonId: string | null) {
  const lesson = lessonId
    ? course.lessons.find((item) => item.id === lessonId) ?? null
    : null;
  const lessonContext = lesson
    ? [
        `Current lesson: ${lesson.number}. ${lesson.title}`,
        `Lesson summary: ${lesson.summary}`,
        `Lesson glossary: ${lesson.glossary
          .slice(0, 12)
          .map((item) => `${item.term}${item.translation ? ` = ${item.translation}` : ""}`)
          .join("; ")}`,
        `Lesson exercises: ${lesson.exercises
          .slice(0, 8)
          .map((item) => item.prompt)
          .join("\n")}`,
      ].join("\n")
    : "No specific lesson selected.";

  return [
    `Course: ${course.title}`,
    `Lessons available: ${course.lessons
      .map((item) => `${item.number}. ${item.title}`)
      .join("; ")}`,
    lessonContext,
  ].join("\n\n");
}

export async function answerLanguageTutorQuestion(input: {
  courseId: string;
  lessonId: string | null;
  threadId?: string | null;
  message: string;
}) {
  const course = await readLanguageCourse(input.courseId);

  if (!course) {
    throw new Error("Course not found.");
  }

  const existingThread = input.threadId
    ? await readLanguageTutorThread(input.threadId)
    : null;

  const userMessage: LanguageTutorMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: input.message,
    createdAt: nowIso(),
  };

  const priorMessages = existingThread?.messages ?? [];
  const context = buildCourseContext(course, input.lessonId);

  const assistantText = await callLanguageTextModel({
    purpose: "tutor",
    messages: [
      {
        role: "system",
        content:
          "You are an AI language tutor. Explain grammar clearly, answer in the user's language unless asked otherwise, use the current course and lesson context, avoid hallucinating textbook content, and give examples when useful.",
      },
      {
        role: "system",
        content: context,
      },
      ...priorMessages
        .filter((item) => item.role !== "system")
        .slice(-10)
        .map((item) => ({
          role: item.role,
          content: item.content,
        })),
      {
        role: "user",
        content: input.message,
      },
    ],
  });
  const assistantMessage: LanguageTutorMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: assistantText,
    createdAt: nowIso(),
  };
  const timestamp = nowIso();
  const thread: LanguageTutorThread = languageTutorThreadSchema.parse({
    id: existingThread?.id ?? crypto.randomUUID(),
    courseId: course.id,
    lessonId: input.lessonId,
    title:
      existingThread?.title ??
      (input.lessonId
        ? `Lesson tutor: ${course.lessons.find((item) => item.id === input.lessonId)?.title ?? "Lesson"}`
        : `Course tutor: ${course.title}`),
    createdAt: existingThread?.createdAt ?? timestamp,
    updatedAt: timestamp,
    messages: [...priorMessages, userMessage, assistantMessage],
  });

  await upsertLanguageTutorThread(thread);

  return {
    thread,
    assistantMessage,
  };
}
