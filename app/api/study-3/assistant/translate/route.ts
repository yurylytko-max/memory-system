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
  "translation": "string"
}

Правила:
- отвечай только на русском
- дай естественный перевод выбранной немецкой фразы
- без комментариев

Учебник: ${body.bookTitle ?? ""}
Страница: ${body.pageTitle ?? ""}
Фраза: ${text}
Контекст: ${context}
`.trim(), "STUDY-3 TRANSLATE");

    const translation =
      typeof parsed?.translation === "string"
        ? parsed.translation.trim()
        : typeof parsed === "string"
          ? parsed.trim()
          : "";

    if (!translation) {
      throw new Error("Gemini не вернул перевод.");
    }

    return NextResponse.json({ translation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось получить перевод." },
      { status: 502 }
    );
  }
}
