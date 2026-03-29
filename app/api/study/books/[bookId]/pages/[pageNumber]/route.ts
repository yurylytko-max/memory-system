import { NextResponse } from "next/server";

import { readStudyBook, readStudyPageAnnotation } from "@/lib/server/study-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookId: string; pageNumber: string }> }
) {
  const { bookId, pageNumber } = await context.params;
  const book = await readStudyBook(bookId);

  if (!book) {
    return NextResponse.json({ error: "Учебник не найден." }, { status: 404 });
  }

  const page = Math.max(1, Number.parseInt(pageNumber, 10) || 1);
  const annotation = await readStudyPageAnnotation(bookId, page);

  if (!annotation) {
    return NextResponse.json({ error: "Разметка страницы не найдена." }, { status: 404 });
  }

  return NextResponse.json({ annotation });
}
