import { NextResponse } from "next/server";

function buildPrompt(text: string, context: string) {
  return `
Объясни на русском выделенную немецкую фразу из учебника.

Верни строго JSON:
{
  "explanation": "string"
}

Что нужно объяснить:
1. перевод
2. грамматику
3. как используется фраза

Правила:
- только русский язык
- коротко и по делу
- не пересказывай всю страницу
- не добавляй текст вне JSON

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
    console.error("STUDY EXPLAIN ERROR:", response.status, rawResponse);
    return NextResponse.json({ error: "Не удалось получить объяснение." }, { status: 502 });
  }

  const envelope = JSON.parse(rawResponse);
  const modelText =
    envelope?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";
  const fenced = modelText.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? modelText;
  const first = fenced.indexOf("{");
  const last = fenced.lastIndexOf("}");
  const jsonText = first >= 0 && last > first ? fenced.slice(first, last + 1) : null;

  if (!jsonText) {
    return NextResponse.json(
      { error: "Ассистент не вернул JSON объяснения.", raw: modelText },
      { status: 502 }
    );
  }

  const parsed = JSON.parse(jsonText) as { explanation?: string };

  return NextResponse.json({
    explanation: parsed.explanation?.trim() ?? "",
  });
}
