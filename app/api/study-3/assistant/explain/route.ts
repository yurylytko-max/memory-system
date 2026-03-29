import { NextResponse } from "next/server";

import { clampSelectionText } from "@/lib/study-3";
import { callStudyThreeGeminiJson } from "@/lib/server/study-3-gemini";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    text?: string;
    context?: string;
    pageTitle?: string;
    bookTitle?: string;
  };
  const text = clampSelectionText(body.text ?? "");
  const context = clampSelectionText(body.context ?? "");

  if (!text) {
    return NextResponse.json({ error: "Нужен выбранный текст." }, { status: 400 });
  }

  try {
    const parsed = await callStudyThreeGeminiJson(`
Верни только JSON:
{
  "explanation": "string"
}

Правила:
- отвечай только на русском
- кратко объясни перевод, грамматику и употребление
- без воды и без комментариев вне JSON

Учебник: ${body.bookTitle ?? ""}
Страница: ${body.pageTitle ?? ""}
Фраза: ${text}
Контекст: ${context}
`.trim(), "STUDY-3 EXPLAIN");

    const explanation =
      typeof parsed?.explanation === "string"
        ? parsed.explanation.trim()
        : typeof parsed === "string"
          ? parsed.trim()
          : "";

    if (!explanation) {
      throw new Error("Gemini не вернул объяснение.");
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось получить объяснение." },
      { status: 502 }
    );
  }
}
