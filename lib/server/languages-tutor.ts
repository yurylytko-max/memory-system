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

function nowIso() {
  return new Date().toISOString();
}

function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY;
}

async function extractText(payload: unknown): Promise<string> {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid OpenAI response.");
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const output = Array.isArray(record.output) ? record.output : [];

  for (const item of output) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];

    for (const chunk of content) {
      if (typeof chunk !== "object" || chunk === null) {
        continue;
      }

      const text = (chunk as Record<string, unknown>).text;

      if (typeof text === "string" && text.trim()) {
        return text.trim();
      }
    }
  }

  throw new Error("No assistant text returned.");
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
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

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

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LANGUAGE_TUTOR_OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are an AI language tutor. Explain grammar clearly, answer in the user's language unless asked otherwise, use the current course and lesson context, avoid hallucinating textbook content, and give examples when useful.",
            },
          ],
        },
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: context,
            },
          ],
        },
        ...priorMessages
          .filter((item) => item.role !== "system")
          .slice(-10)
          .map((item) => ({
            role: item.role,
            content: [{ type: "input_text", text: item.content }],
          })),
        {
          role: "user",
          content: [{ type: "input_text", text: input.message }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI tutor request failed with ${response.status}: ${errorText.slice(0, 400)}`
    );
  }

  const assistantText = await extractText(await response.json());
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
