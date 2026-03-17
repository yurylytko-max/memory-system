import { NextResponse } from "next/server";
import { z } from "zod";

import { answerLanguageTutorQuestion } from "@/lib/server/languages-tutor";

const bodySchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().nullable().optional(),
  threadId: z.string().nullable().optional(),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tutor request." }, { status: 400 });
  }

  try {
    const result = await answerLanguageTutorQuestion({
      courseId: parsed.data.courseId,
      lessonId: parsed.data.lessonId ?? null,
      threadId: parsed.data.threadId ?? null,
      message: parsed.data.message,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tutor request failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
