import { NextResponse } from "next/server";

import {
  readStudyThreeBook,
  readStudyThreeBookFile,
} from "@/lib/server/study-3-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await context.params;
  const book = await readStudyThreeBook(bookId);

  if (!book) {
    return NextResponse.json({ error: "Учебник не найден." }, { status: 404 });
  }

  const file = await readStudyThreeBookFile(bookId);

  if (!file) {
    return NextResponse.json({ error: "Файл учебника не найден." }, { status: 404 });
  }

  return new NextResponse(file, {
    status: 200,
    headers: {
      "Content-Type": book.mime_type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(book.file_name)}"`,
      "Cache-Control": "no-store",
    },
  });
}
