import { NextResponse } from "next/server";

import { extractHtmlFragment } from "@/lib/study-3";
import {
  readStudyThreeBook,
  readStudyThreeBookFile,
} from "@/lib/server/study-3-store";

async function callGemini(params: {
  mimeType: string;
  base64: string;
  bookTitle: string;
  pageNumber: number;
}) {
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
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: params.mimeType,
                  data: params.base64,
                },
              },
              {
                text: `
You are reconstructing structured learning content.

Input: textbook page screenshots.

Your task:
Extract CONTENT, not layout.

STRICT RULES:
- IGNORE all visual positioning
- DO NOT replicate page coordinates
- DO NOT use inline styles
- Use clean semantic HTML only

STRUCTURE RULES:
1. Preserve logical order:
   title -> section -> instruction -> dialogues -> lists -> exercises
2. Use semantic HTML:
   - Titles -> h1/h2/h3
   - Instructions -> p
   - Dialogues -> div class="dialogue" with lines as p
   - Lists -> ul/li
   - Tables only if clearly categorical
3. Group each dialogue and exercise into separate blocks
4. Clean text:
   - merge broken lines
   - remove duplicates
   - restore full sentences

Return ONLY a clean HTML fragment.
No markdown.
No JSON.
No comments.

Book: ${params.bookTitle}
Page: ${params.pageNumber}
                `.trim(),
              },
            ],
          },
        ],
      }),
    }
  );

  const raw = await response.text();

  if (!response.ok) {
    console.error("STUDY-3 BUILD HTML ERROR:", response.status, raw);
    throw new Error("Gemini не смог построить HTML страницы.");
  }

  let envelope: any = null;

  try {
    envelope = JSON.parse(raw);
  } catch {
    console.error("STUDY-3 BUILD HTML INVALID ENVELOPE:", raw);
    throw new Error("Gemini вернул некорректный ответ.");
  }

  const text =
    envelope?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

  const html = extractHtmlFragment(text);

  if (!html) {
    console.error("STUDY-3 BUILD HTML NOT FOUND:", text);
    throw new Error("Gemini не вернул HTML.");
  }

  return html;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await context.params;
  const book = await readStudyThreeBook(bookId);

  const body = (await request.json().catch(() => ({}))) as {
    pageNumber?: number;
    imageBase64?: string;
    imageMimeType?: string;
    fileBase64?: string;
    fileMimeType?: string;
    bookTitle?: string;
  };

  const inlineBase64 = body.imageBase64 || body.fileBase64 || "";
  const inlineMimeType =
    (typeof body.imageMimeType === "string" && body.imageMimeType.trim()) ||
    (typeof body.fileMimeType === "string" && body.fileMimeType.trim()) ||
    "";

  if (!book && !inlineBase64) {
    return NextResponse.json({ error: "Учебник не найден." }, { status: 404 });
  }

  const bookTitle =
    typeof body.bookTitle === "string" && body.bookTitle.trim().length > 0
      ? body.bookTitle.trim()
      : book?.title ?? "Учебник";

  if (!inlineBase64 && book && !book.mime_type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Для PDF сначала нужно собрать страницу для Gemini." },
      { status: 400 }
    );
  }

  const file = inlineBase64 ? null : await readStudyThreeBookFile(bookId);

  if (!inlineBase64 && !file) {
    return NextResponse.json({ error: "Файл учебника не найден." }, { status: 404 });
  }

  try {
    const html = await callGemini({
      mimeType:
        inlineMimeType.length > 0
          ? inlineMimeType
          : book?.mime_type ?? "image/png",
      base64: inlineBase64 || file!.toString("base64"),
      bookTitle,
      pageNumber: Math.max(1, Number(body.pageNumber) || 1),
    });

    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось построить HTML." },
      { status: 502 }
    );
  }
}
