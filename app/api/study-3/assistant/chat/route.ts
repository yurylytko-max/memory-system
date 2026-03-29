import { NextResponse } from "next/server";

import { clampSelectionText } from "@/lib/study-3";
import { callStudyThreeGeminiJson } from "@/lib/server/study-3-gemini";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    question?: string;
    selectedText?: string;
    context?: string;
    pageTitle?: string;
    bookTitle?: string;
  };
  const question = clampSelectionText(body.question ?? "");

  if (!question) {
    return NextResponse.json({ error: "Нужен вопрос." }, { status: 400 });
  }

  try {
    const parsed = await callStudyThreeGeminiJson(`
Верни только JSON:
{
  "answer": "string"
}

Правила:
- отвечай только на русском
- объясняй по делу и кратко
- опирайся только на выбранный фрагмент и ближайший контекст

Учебник: ${body.bookTitle ?? ""}
Страница: ${body.pageTitle ?? ""}
Выбранная фраза: ${clampSelectionText(body.selectedText ?? "")}
Контекст: ${clampSelectionText(body.context ?? "")}
Вопрос: ${question}
`.trim(), "STUDY-3 CHAT");

    const answer =
      typeof parsed?.answer === "string"
        ? parsed.answer.trim()
        : typeof parsed === "string"
          ? parsed.trim()
          : "";

    if (!answer) {
      throw new Error("Gemini не вернул ответ.");
    }

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ассистент не ответил." },
      { status: 502 }
    );
  }
}
