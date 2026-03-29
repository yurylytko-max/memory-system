import { NextResponse } from "next/server";

import {
  createStudyThreeBlobBook,
  readStudyThreeBooks,
} from "@/lib/server/study-3-store";

export async function GET() {
  const books = await readStudyThreeBooks();
  return NextResponse.json({ books });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      fileName?: string;
      mimeType?: string;
      pageCount?: number;
      fileUrl?: string;
    };

    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl.trim() : "";
    const pageCount = Math.max(1, Number(body.pageCount) || 1);

    if (!fileName || !mimeType || !fileUrl) {
      return NextResponse.json({ error: "Не хватает данных blob-файла." }, { status: 400 });
    }

    const title =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : fileName.replace(/\.[^.]+$/, "");

    const book = await createStudyThreeBlobBook({
      title,
      fileName,
      mimeType,
      pageCount,
      fileUrl,
    });

    return NextResponse.json({ book });
  }

  return NextResponse.json(
    { error: "Прямой upload отключён. Используйте Blob client upload." },
    { status: 400 }
  );
}
