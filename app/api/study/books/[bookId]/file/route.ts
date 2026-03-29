import { NextResponse } from "next/server";

import { readStudyBook, readStudyBookFile } from "@/lib/server/study-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await context.params;
  const book = await readStudyBook(bookId);

  if (!book) {
    return NextResponse.json({ error: "Учебник не найден." }, { status: 404 });
  }

  const file = await readStudyBookFile(book);

  return new NextResponse(file, {
    headers: {
      "Content-Type": book.mime_type,
      "Content-Disposition": `inline; filename="${book.file_name}"`,
      "Cache-Control": "no-store",
    },
  });
}
