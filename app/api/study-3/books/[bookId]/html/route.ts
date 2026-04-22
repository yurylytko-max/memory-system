import { NextResponse } from "next/server";

import type { StudyThreePageLayout } from "@/lib/study-3";
import { extractHtmlFragment } from "@/lib/study-3";
import { renderStudyThreePageLayout } from "@/lib/server/study-3-renderer";
import { callStudyThreeGeminiHtml } from "@/lib/server/study-3-gemini";
import {
  readStudyThreeBook,
  readStudyThreeBookFile,
  readStudyThreeBookHtmlPage,
  writeStudyThreeBookHtml,
} from "@/lib/server/study-3-store";

function parseLayoutJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();

  try {
    const parsed = JSON.parse(candidate) as {
      page_title?: string;
      blocks?: unknown[];
    };

    return Array.isArray(parsed?.blocks)
      ? ({
          page_title:
            typeof parsed.page_title === "string" && parsed.page_title.trim().length > 0
              ? parsed.page_title.trim()
              : "Учебная страница",
          blocks: parsed.blocks as StudyThreePageLayout["blocks"],
        } satisfies StudyThreePageLayout)
      : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await context.params;
  const book = await readStudyThreeBook(bookId);

  if (!book) {
    return NextResponse.json({ error: "Учебник не найден." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const pageNumber = Math.max(1, Number(searchParams.get("pageNumber")) || 1);
  const page = await readStudyThreeBookHtmlPage(bookId, pageNumber);

  return NextResponse.json({
    page: {
      pageNumber: page.page_number,
      status: page.status,
      htmlContent: page.html_content,
      ...(page.layout_json ? { layoutJson: page.layout_json } : {}),
    },
  });
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
  const pageNumber = Math.max(1, Number(body.pageNumber) || 1);

  if (book) {
    const page = await readStudyThreeBookHtmlPage(bookId, pageNumber);

    if (page.status === "generated") {
      return NextResponse.json({
        page: {
          pageNumber: page.page_number,
          status: page.status,
          htmlContent: page.html_content,
          ...(page.layout_json ? { layoutJson: page.layout_json } : {}),
        },
        generated: false,
      });
    }
  }

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
    const rawResponse = await callStudyThreeGeminiHtml({
      mimeType:
        inlineMimeType.length > 0
          ? inlineMimeType
          : book?.mime_type ?? "image/png",
      base64: inlineBase64 || file!.toString("base64"),
      logPrefix: "STUDY-3 BUILD HTML",
      prompt: `
You are reconstructing a textbook page into structured JSON blocks for study.

Goal:
Preserve the learning structure of the original page, not just the raw text.

Return ONLY JSON:
{
  "page_title": "string",
  "blocks": [
    {
      "type": "title | heading | paragraph | dialogue | exercise | note | vocabulary | image | table | list",
      "order": 1,
      "label": "string optional",
      "text": "string optional",
      "lines": ["string optional"],
      "items": ["string optional"],
      "rows": [["string optional"]],
      "caption": "string optional"
    }
  ]
}

Rules:
- preserve sections, task blocks, notes, dialogues, vocabulary boxes, examples, illustrations and tables
- keep order close to the original page
- do not summarize the content
- do not return HTML
- do not return markdown
- do not use absolute coordinates
- do not flatten the page into generic paragraphs
- if the page contains any illustration, icon, photo, drawing, comic panel, visual cue, boxed image or other non-text visual element, you MUST return a separate "image" block for it
- if the page has a visually distinct box, banner, exercise area, vocabulary area or note area, keep it as a separate block instead of merging it into neighbouring text
- preserve the textbook feel of the page: headings, subheadings, labels, numbering, exercises, side notes, vocabulary boxes and image areas should remain distinct in the output structure
- when text belongs to an image, caption or callout, keep that association in the same nearby block sequence
- if there are multiple visual sections on the page, represent each section separately and in order from top to bottom, left to right
- use "dialogue" for speaker lines
- use "exercise" for tasks/questions
- use "note" for grammar or side notes
- use "vocabulary" for word lists or lexical boxes
- use "image" for illustrations or visual blocks; put short human-readable description in "caption"
- use "table" only when content is clearly tabular
- if a block has no meaningful text, omit it
- it is better to return more distinct blocks than to merge unrelated page regions
- do not lose images or visual teaching elements just because they contain little or no text

Book: ${bookTitle}
Page: ${pageNumber}
      `.trim(),
    });
    const layoutJson = parseLayoutJson(rawResponse);
    const html = layoutJson
      ? renderStudyThreePageLayout(layoutJson)
      : extractHtmlFragment(rawResponse);

    if (!html) {
      console.error("STUDY-3 BUILD HTML NOT FOUND:", rawResponse);
      throw new Error("Gemini не вернул HTML.");
    }

    if (book) {
      await writeStudyThreeBookHtml({
        bookId,
        pageNumber,
        html,
        ...(layoutJson ? { layoutJson } : {}),
      });
    }

    return NextResponse.json({
      page: {
        pageNumber,
        status: "generated",
        htmlContent: html,
        ...(layoutJson ? { layoutJson } : {}),
      },
      generated: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось построить HTML." },
      { status: 502 }
    );
  }
}
