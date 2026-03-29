import { NextResponse } from "next/server";

import {
  extractJsonObject,
  normalizeStudyPageDocument,
} from "@/lib/study";
import {
  readStudyBook,
  readStudyPageAnnotation,
  writeStudyPageAnnotation,
} from "@/lib/server/study-store";

function buildPrompt(pageNumber: number) {
  return `
Ты анализируешь одну страницу учебника немецкого языка.

Твоя задача:
- не генерировать новый урок
- не делать словарь
- не делать карточки
- не делать объяснения
- не делать тесты
- восстановить только структуру страницы как structured JSON

Нужно вернуть строго JSON такого формата:
{
  "page_number": ${pageNumber},
  "lesson_title": "string",
  "footer": "string",
  "blocks": [
    {
      "type": "section",
      "id": "string",
      "title": "string",
      "blocks": [
        {
          "type": "instruction",
          "text": "string"
        },
        {
          "type": "word_bank",
          "items": [
            {
              "text": "string",
              "clickable": true,
              "crossed_out": false
            }
          ]
        },
        {
          "type": "dialogue_group",
          "items": [
            {
              "id": "string",
              "title": "string",
              "image": {
                "label": "string"
              },
              "lines": [
                {
                  "speaker": "A",
                  "parts": [
                    { "type": "text", "text": "string" },
                    { "type": "phrase", "text": "string" },
                    { "type": "blank", "id": "string", "answer": "string" },
                    { "type": "highlight", "text": "string" }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "table",
          "title": "string",
          "headers": ["string"],
          "rows": [["string"]]
        },
        {
          "type": "conversation_group",
          "items": [
            {
              "id": "string",
              "title": "string",
              "lines": [
                {
                  "speaker": "A",
                  "parts": [
                    { "type": "text", "text": "string" },
                    { "type": "phrase", "text": "string" }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "paragraph",
          "parts": [
            { "type": "text", "text": "string" }
          ]
        },
        {
          "type": "image_placeholder",
          "label": "string"
        },
        {
          "type": "separator"
        }
      ]
    }
  ]
}

Правила:
- сохранить учебные блоки сверху вниз
- если есть диалоги, вернуть их как dialogue_group
- если есть мини-диалоги или numbered conversations, вернуть их как conversation_group
- если есть пропуски, вернуть blank blocks внутри parts
- если есть важные слова и фразы, которые пользователь может кликать, вернуть их как parts type="phrase"
- если есть выделение маркером, вернуть type="highlight"
- если есть картинка, не описывай её подробно, а верни image_placeholder
- не использовать координаты, CSS и HTML
- не добавлять ничего, чего нет на странице
- ответ только JSON
`.trim();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string; pageNumber: string }> }
) {
  const { bookId, pageNumber } = await context.params;
  const book = await readStudyBook(bookId);

  if (!book) {
    return NextResponse.json({ error: "Учебник не найден." }, { status: 404 });
  }

  const page = Math.max(1, Number.parseInt(pageNumber, 10) || 1);
  const existing = await readStudyPageAnnotation(bookId, page);

  if (existing) {
    return NextResponse.json({ annotation: existing, cached: true });
  }

  const body = (await request.json()) as { imageDataUrl?: string };
  const imageDataUrl = body.imageDataUrl?.trim() ?? "";

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Нужно передать изображение страницы." }, { status: 400 });
  }

  const commaIndex = imageDataUrl.indexOf(",");

  if (commaIndex === -1) {
    return NextResponse.json({ error: "Некорректный формат изображения." }, { status: 400 });
  }

  const header = imageDataUrl.slice(0, commaIndex);
  const mimeType = header.match(/^data:(.*?);base64$/)?.[1] ?? "image/png";
  const base64 = imageDataUrl.slice(commaIndex + 1);
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
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
              {
                text: buildPrompt(page),
              },
            ],
          },
        ],
      }),
    }
  );

  const rawResponse = await response.text();

  if (!response.ok) {
    console.error("STUDY PAGE ANNOTATION ERROR:", response.status, rawResponse);
    return NextResponse.json(
      { error: "Gemini не смог разметить страницу.", raw: rawResponse },
      { status: 502 }
    );
  }

  let parsedResponse: any = null;

  try {
    parsedResponse = JSON.parse(rawResponse);
  } catch {
    console.error("INVALID GEMINI ENVELOPE:", rawResponse);
    return NextResponse.json(
      { error: "Gemini вернул некорректный ответ.", raw: rawResponse },
      { status: 502 }
    );
  }

  const modelText =
    parsedResponse?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

  const jsonText = extractJsonObject(modelText);

  if (!jsonText) {
    console.error("STUDY ANNOTATION JSON NOT FOUND:", modelText);
    return NextResponse.json(
      { error: "Gemini не вернул structured JSON.", raw: modelText },
      { status: 502 }
    );
  }

  let parsedDocument: unknown;

  try {
    parsedDocument = JSON.parse(jsonText);
  } catch {
    console.error("STUDY ANNOTATION INVALID JSON:", modelText);
    return NextResponse.json(
      { error: "Gemini вернул невалидный JSON.", raw: modelText },
      { status: 502 }
    );
  }

  const annotation = normalizeStudyPageDocument(parsedDocument, page);
  await writeStudyPageAnnotation(bookId, page, annotation);

  return NextResponse.json({ annotation, cached: false });
}
