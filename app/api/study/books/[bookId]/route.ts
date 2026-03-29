import { NextResponse } from "next/server";

import {
  listSavedStudyPages,
  readStudyBook,
} from "@/lib/server/study-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await context.params;
  const book = await readStudyBook(bookId);

  if (!book) {
    return NextResponse.json({ error: "Учебник не найден." }, { status: 404 });
  }

  const annotatedPages = await listSavedStudyPages(bookId);

  return NextResponse.json({
    book,
    annotated_pages: annotatedPages,
  });
}
