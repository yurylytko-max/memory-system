import { NextResponse } from "next/server";

import { extractHtmlFragment } from "@/lib/study-3";
import { callStudyThreeGeminiHtml } from "@/lib/server/study-3-gemini";
import {
  readStudyThreeBook,
  readStudyThreeBookFile,
} from "@/lib/server/study-3-store";

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
    const rawHtml = await callStudyThreeGeminiHtml({
      mimeType:
        inlineMimeType.length > 0
          ? inlineMimeType
          : book?.mime_type ?? "image/png",
      base64: inlineBase64 || file!.toString("base64"),
      logPrefix: "STUDY-3 BUILD HTML",
      prompt: `
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

Book: ${bookTitle}
Page: ${Math.max(1, Number(body.pageNumber) || 1)}
      `.trim(),
    });
    const html = extractHtmlFragment(rawHtml);

    if (!html) {
      console.error("STUDY-3 BUILD HTML NOT FOUND:", rawHtml);
      throw new Error("Gemini не вернул HTML.");
    }

    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось построить HTML." },
      { status: 502 }
    );
  }
}
