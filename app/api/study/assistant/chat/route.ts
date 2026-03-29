import { NextResponse } from "next/server";

function buildPrompt(question: string, selectedText: string, context: string, pageTitle: string) {
  return `
Ты ассистент по немецкому учебнику.
Отвечай только на русском языке.

Верни строго JSON:
{
  "answer": "string"
}

Правила:
- отвечай по текущему фрагменту и странице
- не придумывай материал, которого нет в вопросе и контексте
- объясняй кратко и понятно
- не используй английский
- не добавляй текст вне JSON

Заголовок страницы: ${pageTitle || "не указан"}
Выбранный фрагмент: ${selectedText || "не указан"}
Контекст: ${context || "не указан"}
Вопрос пользователя: ${question}
`.trim();
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    question?: string;
    selectedText?: string;
    context?: string;
    pageTitle?: string;
  };

  const question = body.question?.trim() ?? "";
  const selectedText = body.selectedText?.trim() ?? "";
  const context = body.context?.trim() ?? "";
  const pageTitle = body.pageTitle?.trim() ?? "";

  if (!question) {
    return NextResponse.json({ error: "Вопрос не передан." }, { status: 400 });
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
            parts: [{ text: buildPrompt(question, selectedText, context, pageTitle) }],
          },
        ],
      }),
    }
  );

  const rawResponse = await response.text();

  if (!response.ok) {
    console.error("STUDY CHAT ERROR:", response.status, rawResponse);
    return NextResponse.json({ error: "Ассистент не ответил." }, { status: 502 });
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
      { error: "Ассистент не вернул JSON ответа.", raw: modelText },
      { status: 502 }
    );
  }

  const parsed = JSON.parse(jsonText) as { answer?: string };

  return NextResponse.json({
    answer: parsed.answer?.trim() ?? "",
  });
}
