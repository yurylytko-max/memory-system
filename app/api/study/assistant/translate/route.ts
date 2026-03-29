import { NextResponse } from "next/server";

import { extractJsonObject } from "@/lib/study";

function buildPrompt(text: string, context: string) {
  return `
Переведи на русский язык выделенный фрагмент немецкого учебника.

Верни строго JSON:
{
  "text": "${text.replace(/"/g, '\\"')}",
  "translation": "string"
}

Правила:
- перевод только на русском
- не добавляй английский
- переведи именно выделенный фрагмент
- если контекст помогает, учти его
- никаких комментариев вне JSON

Фраза: ${text}
Контекст: ${context || "нет"}
`.trim();
}

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; context?: string };
  const text = body.text?.trim() ?? "";
  const context = body.context?.trim() ?? "";

  if (!text || text.length > 300) {
    return NextResponse.json(
      { error: "Нужно передать короткий текст до 300 символов." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY не настроен." }, { status: 500 });
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(text, context) }],
          },
        ],
      }),
    }
  );

  const rawResponse = await response.text();

  if (!response.ok) {
    console.error("STUDY TRANSLATE ERROR:", response.status, rawResponse);
    return NextResponse.json({ error: "Не удалось получить перевод." }, { status: 502 });
  }

  const envelope = JSON.parse(rawResponse);
  const modelText =
    envelope?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";
  const jsonText = extractJsonObject(modelText);

  if (!jsonText) {
    return NextResponse.json(
      { error: "Ассистент не вернул JSON перевода.", raw: modelText },
      { status: 502 }
    );
  }

  const parsed = JSON.parse(jsonText) as { text?: string; translation?: string };

  return NextResponse.json({
    text,
    translation: parsed.translation?.trim() ?? "",
  });
}
