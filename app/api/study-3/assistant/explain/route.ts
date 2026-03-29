import { NextResponse } from "next/server";

import { clampSelectionText, extractJsonObject } from "@/lib/study-3";

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY не настроен.");
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
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const raw = await response.text();

  if (!response.ok) {
    console.error("STUDY-3 EXPLAIN ERROR:", response.status, raw);
    throw new Error("Gemini не ответил.");
  }

  let envelope: any = null;

  try {
    envelope = JSON.parse(raw);
  } catch {
    console.error("STUDY-3 EXPLAIN INVALID GEMINI ENVELOPE:", raw);
    throw new Error("Gemini вернул некорректный ответ.");
  }
  const text =
    envelope?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";
  const jsonText = extractJsonObject(text);

  if (!jsonText) {
    console.error("STUDY-3 EXPLAIN JSON NOT FOUND:", text);
    throw new Error("Gemini не вернул JSON.");
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    console.error("STUDY-3 EXPLAIN INVALID JSON:", jsonText);
    throw new Error("Gemini вернул невалидный JSON.");
  }
}

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
    const parsed = await callGemini(`
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
`.trim());

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
