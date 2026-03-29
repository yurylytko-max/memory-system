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
    console.error("STUDY-3 CHAT ERROR:", response.status, raw);
    throw new Error("Gemini не ответил.");
  }

  let envelope: any = null;

  try {
    envelope = JSON.parse(raw);
  } catch {
    console.error("STUDY-3 CHAT INVALID GEMINI ENVELOPE:", raw);
    throw new Error("Gemini вернул некорректный ответ.");
  }
  const text =
    envelope?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";
  const jsonText = extractJsonObject(text);

  if (!jsonText) {
    console.error("STUDY-3 CHAT JSON NOT FOUND:", text);
    throw new Error("Gemini не вернул JSON.");
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    console.error("STUDY-3 CHAT INVALID JSON:", jsonText);
    throw new Error("Gemini вернул невалидный JSON.");
  }
}

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
    const parsed = await callGemini(`
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
`.trim());

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
