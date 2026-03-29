import { NextResponse } from "next/server";

import { readStudyThreeBook } from "@/lib/server/study-3-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await context.params;
  const book = await readStudyThreeBook(bookId);

  if (!book) {
    return NextResponse.json({ error: "Учебник не найден." }, { status: 404 });
  }

  return NextResponse.json({ book });
}
